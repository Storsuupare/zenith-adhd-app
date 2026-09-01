const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { syncLimiter, mutationLimiter } = require("../lib/rateLimiters.js");
const { pushUserPatch } = require("../lib/realtime.js");
const { VALID_SKILLS } = require("../lib/validation.js");
const { CREDIT_BY_RARITY } = require("../LootData.js");

const router = express.Router();

// ── Subscription sync ────────────────────────────────────────────────────────
// Restore Purchases confirms Apple's truth locally via the SDK, but has no way to
// write it back to our database — only the webhook does that, and webhooks can be
// missed or misconfigured. This endpoint asks RevenueCat directly for the real
// entitlement state and makes it authoritative, so Restore can actually repair a
// role that's drifted out of sync instead of just re-reading the same stale row.
const REVENUECAT_SECRET_KEY = process.env.REVENUECAT_SECRET_KEY;
const ENTITLEMENT_ROLES = {
  PRO:   { role: "PRO",   accountTier: 1 },
  ELITE: { role: "ELITE", accountTier: 2 },
};

router.post("/subscription/sync", requireAuth, syncLimiter, async (req, res) => {
  if (!REVENUECAT_SECRET_KEY) {
    return res.status(503).json({ error: "SYNC_NOT_CONFIGURED" });
  }
  const clerkUserId = req.auth.userId;

  try {
    const currentUserRes = await pool.query(
      "SELECT COALESCE(role, 'FREE') AS role, COALESCE(account_tier, 0) AS account_tier FROM users WHERE external_id = $1",
      [clerkUserId],
    );
    if (currentUserRes.rows.length === 0) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const currentRole = currentUserRes.rows[0].role;
    const currentTier = currentUserRes.rows[0].account_tier;

    const subscriberResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(clerkUserId)}`,
      { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY}` } },
    );
    if (!subscriberResponse.ok) {
      console.error(`[SUBSCRIPTION_SYNC] RevenueCat returned ${subscriberResponse.status} for ${clerkUserId}`);
      return res.status(502).json({ error: "REVENUECAT_UNAVAILABLE" });
    }

    const { subscriber } = await subscriberResponse.json();
    const entitlements = subscriber?.entitlements ?? {};
    const now = new Date();

    // ELITE is checked last so it wins if both were somehow active at once — the
    // higher tier should never be shadowed by a stale lower grant.
    let resolved = { role: "FREE", accountTier: 0 };
    for (const [entitlementId, mapping] of Object.entries(ENTITLEMENT_ROLES)) {
      const entitlement = entitlements[entitlementId];
      const isActive = entitlement && (!entitlement.expires_date || new Date(entitlement.expires_date) > now);
      if (isActive) resolved = mapping;
    }

    // This endpoint only ever moves a subscriber up, or leaves them unchanged.
    // A false negative here — a RevenueCat hiccup, an entitlement identifier
    // that doesn't quite match what's configured on their side — must never cost
    // someone their paid access with no way to appeal it, since this runs off a
    // single ambiguous read triggered by a Restore tap. Real expiry is handled by
    // the webhook's EXPIRATION/BILLING_ISSUE events instead, which are explicit,
    // intentional signals from Apple rather than a guess.
    if (resolved.accountTier < currentTier) {
      return res.json({ role: currentRole, account_tier: currentTier });
    }

    await pool.query(
      "UPDATE users SET role = $1, account_tier = $2 WHERE external_id = $3",
      [resolved.role, resolved.accountTier, clerkUserId],
    );
    console.log(`[SUBSCRIPTION_SYNC] ${clerkUserId} → ${resolved.role}`);

    res.json({ role: resolved.role, account_tier: resolved.accountTier });
  } catch (err) {
    console.error("[SUBSCRIPTION_SYNC] failed:", err.message);
    res.status(500).json({ error: "SYNC_FAILED" });
  }
});

router.post("/skills/prestige", requireAuth, mutationLimiter, async (req, res) => {
  const { skillName } = req.body;
  const externalId = req.auth.userId;

  if (!skillName || !VALID_SKILLS.has(skillName.toUpperCase()))
    return res.status(400).json({ error: "Invalid skill name" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Open to every tier — Prestige is a mastery reward (level 99 in a skill),
    // not a paid perk. Gating it behind PRO put a paywall in front of exactly
    // the most engaged users at their proudest moment, which cuts against the
    // "paying buys capacity, never an outcome" principle everywhere else.
    const prestigeUserRes = await client.query(
      "SELECT id FROM users WHERE external_id = $1 FOR UPDATE",
      [externalId],
    );
    if (prestigeUserRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const userId = prestigeUserRes.rows[0].id;

    const skillRes = await client.query(
      `UPDATE user_skills
       SET level = 1, xp = 0,
           prestige_level      = COALESCE(user_skills.prestige_level, 0) + 1,
           next_level_xp       = 500,
           prestige_boost_until = NOW() + INTERVAL '24 hours'
       FROM skills
       WHERE user_skills.skill_id = skills.id
         AND user_skills.user_id = $1
         AND LOWER(skills.name) = LOWER($2)
         AND user_skills.level >= 99
       RETURNING user_skills.*, skills.name AS skill_name`,
      [userId, skillName],
    );

    if (skillRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "REQUIREMENTS_NOT_MET" });
    }

    // Flat, not scaling with prestige level — credits are a nice-to-have here,
    // not the point. The real reward is the perk: REDZONE immunity unlocks on
    // the first Prestige and lasts forever after, on that skill specifically.
    const newPrestigeLevel = skillRes.rows[0].prestige_level;
    const prestigeReward   = CREDIT_BY_RARITY["Mythic"];
    const creditRes = await client.query(
      `UPDATE users
       SET system_credits = COALESCE(system_credits, 0) + $1
       WHERE id = $2
       RETURNING system_credits`,
      [prestigeReward, userId],
    );

    await client.query("COMMIT");

    await pushUserPatch(externalId).catch(() => {});

    res.json({
      success:          true,
      message:          "PRESTIGE_COMPLETE",
      skill:            skillRes.rows[0],
      system_credits:   creditRes.rows[0]?.system_credits,
      drop:             { rarity: "Mythic", credits_earned: prestigeReward },
      redzoneImmunity:  newPrestigeLevel === 1,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
