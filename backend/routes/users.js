const express = require("express");
const pool = require("../lib/db.js");
const { clerkClient } = require("../lib/clients.js");
const { requireAuth } = require("../lib/auth.js");
const { bonusLimiter, mutationLimiter } = require("../lib/rateLimiters.js");
const { pushUserPatch } = require("../lib/realtime.js");
const { DAILY_BONUS_CREDITS, BONUS_WINDOW_MS } = require("../lib/economy.js");
const { isReservedUsername } = require("../lib/validation.js");

const router = express.Router();

// ── Daily credit bonus ─────────────────────────────────────────────────────────
// Rolling 24h window (not calendar-day) — prevents midnight spam.
// FOR UPDATE row lock prevents duplicate claims from concurrent requests.

router.post("/api/daily-bonus/claim", requireAuth, bonusLimiter, async (req, res) => {
  const clerkId = req.auth.userId;
  const client  = await pool.connect();
  try {
    await client.query("BEGIN");

    const row = await client.query(
      `SELECT id,
              COALESCE(system_credits, 0)  AS credits,
              COALESCE(account_tier, 0)    AS account_tier,
              daily_bonus_claimed_at
       FROM users WHERE external_id = $1 FOR UPDATE`,
      [clerkId],
    );
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const { id, credits, account_tier, daily_bonus_claimed_at } = row.rows[0];

    if (daily_bonus_claimed_at) {
      const elapsedMs   = Date.now() - new Date(daily_bonus_claimed_at).getTime();
      const secondsLeft = Math.ceil((BONUS_WINDOW_MS - elapsedMs) / 1000);
      if (elapsedMs < BONUS_WINDOW_MS) {
        await client.query("ROLLBACK");
        return res.json({
          already_used:      true,
          seconds_remaining: Math.max(secondsLeft, 0),
          system_credits:    parseInt(credits),
        });
      }
    }

    const earned     = DAILY_BONUS_CREDITS[account_tier] ?? 30;
    const newCredits = parseInt(credits) + earned;
    await client.query(
      "UPDATE users SET system_credits = $1, daily_bonus_claimed_at = NOW() WHERE id = $2",
      [newCredits, id],
    );

    await client.query("COMMIT");
    pushUserPatch(clerkId).catch(() => {});
    res.json({ already_used: false, credits_earned: earned, system_credits: newCredits });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post("/user", requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;

  // Identity is read from Clerk rather than the request body. The client can claim
  // any username/email it likes, and the mobile app historically sent the Clerk ID
  // as the username with an empty email — which left every row unidentifiable in
  // the admin panel. req.auth.userId is already verified, so Clerk is authoritative.
  let username = null;
  let email    = null;
  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    email =
      clerkUser.emailAddresses.find(address => address.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
    username =
      clerkUser.username ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email?.split("@")[0] ||
      clerkId;
  } catch {
    // Clerk unreachable — fall back to the ID rather than blocking account creation.
    username = clerkId;
  }

  // Derived names aren't user-chosen, so a reserved match falls back instead of
  // rejecting — otherwise someone whose email happens to start with "admin"
  // could never create an account.
  if (isReservedUsername(username)) username = clerkId;

  const creationClient = await pool.connect();
  try {
    await creationClient.query("BEGIN");

    const userCreationRes = await creationClient.query(
      "INSERT INTO users (external_id, username, email_address, level, xp, streak, total_xp, current_level) VALUES ($1, $2, $3, 1, 0, 0, 0, 1) RETURNING *",
      [clerkId, username, email],
    );

    const newUser = userCreationRes.rows[0];

    await creationClient.query(
      `INSERT INTO user_skills (user_id, skill_id, xp, level, next_level_xp, prestige_level)
       SELECT $1, id, 0, 1, 500, 0 FROM skills`,
      [newUser.id],
    );

    const postUserMasteryRes = await creationClient.query(
      `SELECT user_skills.id, user_skills.skill_id, skills.name AS skill_name, user_skills.xp AS current_xp,
              user_skills.level AS current_level, user_skills.next_level_xp, user_skills.prestige_level
       FROM user_skills
       JOIN skills ON user_skills.skill_id = skills.id
       WHERE user_skills.user_id = $1
       ORDER BY skills.name`,
      [newUser.id],
    );
    newUser.mastery = postUserMasteryRes.rows;

    await creationClient.query("COMMIT");
    res.status(201).json(newUser);
  } catch (err) {
    await creationClient.query("ROLLBACK");
    console.error("INITIALIZATION_FATAL:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    creationClient.release();
  }
});

router.get("/user/:externalId", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const userDetailsRes = await pool.query(
      `SELECT *,
              COALESCE(system_credits, 0) AS system_credits,
              COALESCE(role, 'FREE')      AS role,
              COALESCE(account_tier, 0)  AS account_tier,
              (SELECT COUNT(*) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS' AND credited_minutes > 0
                 AND completed_at::date = CURRENT_DATE) AS sessions_today,
              (SELECT COALESCE(SUM(credited_minutes), 0) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS'
                 AND completed_at::date = CURRENT_DATE) AS minutes_today,
              (SELECT COUNT(DISTINCT skill_id) FROM tasks
               WHERE user_id::text = users.id::text
                 AND status = 'SUCCESS' AND credited_minutes > 0
                 AND completed_at::date = CURRENT_DATE) AS skills_today,
              CASE
                WHEN streak_last_updated IS NULL THEN 0
                ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - streak_last_updated)) / 86400)::int
              END AS days_since_last_session,
              (SELECT COALESCE(json_agg(day_flags ORDER BY day_flags.day), '[]')
               FROM (
                 SELECT
                   gs.day::date AS day,
                   EXISTS (
                     SELECT 1 FROM tasks
                     WHERE user_id::text = users.id::text
                       AND status = 'SUCCESS'
                       AND completed_at::date = gs.day::date
                   ) AS completed
                 FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS gs(day)
               ) day_flags
              ) AS last_7_days
       FROM users WHERE external_id = $1`,
      [externalId],
    );
    if (userDetailsRes.rows.length === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND" });

    const activeUser = userDetailsRes.rows[0];

    if (activeUser.is_banned)
      return res.status(403).json({ error: "USER_BANNED", reason: activeUser.ban_reason || "Your account has been banned." });

    const activeMasteryRes = await pool.query(
      `SELECT user_skills.id, user_skills.skill_id, skills.name AS skill_name, user_skills.xp AS current_xp,
              user_skills.level AS current_level, user_skills.next_level_xp, user_skills.prestige_level,
              user_skills.prestige_boost_until
       FROM user_skills
       JOIN skills ON user_skills.skill_id = skills.id
       WHERE user_skills.user_id = $1
       ORDER BY skills.name`,
      [activeUser.id],
    );
    activeUser.mastery = activeMasteryRes.rows;

    res.json(activeUser);
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

// ── GDPR account deletion ─────────────────────────────────────────────────────
// Permanently deletes all user data across every table. Irreversible.
router.delete("/user/account", requireAuth, mutationLimiter, async (req, res) => {
  const clerkId = req.auth.userId;

  // Clerk goes first. If it fails, nothing else has happened — the account is
  // untouched and safe to retry. Doing it in this order matters: the reverse
  // (database first, Clerk after) means a failed Clerk deletion leaves the Clerk
  // identity alive after the database row is already gone, and the next sign-in
  // hits a 404 that loadUser() treats as a brand-new user, silently recreating
  // the account someone just asked to delete.
  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (err) {
    console.error("ACCOUNT_DELETE_CLERK_FAILED:", err.message);
    return res.status(500).json({ error: "DELETE_FAILED" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(      
      "SELECT id FROM users WHERE external_id = $1",
      [clerkId],
    );
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ success: true });
    }
    const userId = userRes.rows[0].id;

    await client.query("DELETE FROM inventory          WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM user_skills        WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM tasks              WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM daily_stats        WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM push_subscriptions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM user_achievements  WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users              WHERE id      = $1", [userId]);

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    // The Clerk identity is already gone at this point — the user can't sign
    // back in to retry, so this is now a background cleanup problem, not a
    // user-facing one.
    console.error("ACCOUNT_DELETE_DB_FAILED (Clerk identity already removed):", err.message);
    res.status(500).json({ error: "DELETE_FAILED" });
  } finally {
    client.release();
  }
});

module.exports = router;
