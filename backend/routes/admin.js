const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth, requireAdmin } = require("../lib/auth.js");
const { adminLimiter } = require("../lib/rateLimiters.js");
const { pushUserPatch } = require("../lib/realtime.js");

const router = express.Router();

// ── Admin: manually grant tier by username ────────────────────────────────────
// Used for gifting PRO/ELITE to promoters, testers, etc.
// Body: { username: string, tier: "FREE" | "PRO" | "ELITE" }
// Targets external_id rather than username: usernames are derived from Clerk and
// are not unique, so matching on them could update several accounts at once.
router.post("/admin/grant-tier", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { externalId, tier } = req.body;

  const TIER_MAP = { FREE: 0, PRO: 1, ELITE: 2 };
  const ROLE_MAP = { FREE: "FREE", PRO: "PRO", ELITE: "ELITE" };

  if (!externalId || typeof externalId !== "string")
    return res.status(400).json({ error: "MISSING_EXTERNAL_ID" });
  if (!(tier in TIER_MAP))
    return res.status(400).json({ error: "INVALID_TIER", valid: ["FREE", "PRO", "ELITE"] });

  const newTier = TIER_MAP[tier];
  const newRole = ROLE_MAP[tier];

  try {
    const result = await pool.query(
      `UPDATE users
       SET account_tier = $1,
           role         = $2
       WHERE external_id = $3
       RETURNING external_id, username, role, account_tier`,
      [newTier, newRole, externalId.trim()],
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND", externalId });

    const updated = result.rows[0];
    pushUserPatch(updated.external_id).catch(() => {});

    res.json({
      success:  true,
      username: updated.username,
      role:     updated.role,
      tier:     updated.account_tier,
    });
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

// Also keyed on external_id — see the note on grant-tier above.
router.post("/admin/ban-user", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { externalId, ban, reason } = req.body;
  if (!externalId || typeof externalId !== "string")
    return res.status(400).json({ error: "MISSING_EXTERNAL_ID" });

  try {
    const result = await pool.query(
      `UPDATE users
       SET is_banned  = $1,
           ban_reason = $2
       WHERE external_id = $3 AND is_admin = false
       RETURNING external_id, username, is_banned`,
      [!!ban, ban ? (reason?.trim() || "Banned by admin.") : null, externalId.trim()],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "USER_NOT_FOUND_OR_PROTECTED" });

    const updated = result.rows[0];
    // Push the ban state so the user's session reflects it immediately
    pushUserPatch(updated.external_id).catch(() => {});
    res.json({ success: true, username: updated.username, is_banned: updated.is_banned });
  } catch (err) {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

// ── Admin: list all users ────────────────────────────────────────────────────
router.get("/admin/users", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  const { search } = req.query;
  try {
    let result;
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      result = await pool.query(
        `SELECT external_id, username, email_address,
                COALESCE(role, 'FREE') AS role,
                COALESCE(account_tier, 0) AS account_tier,
                COALESCE(level, 1) AS level,
                COALESCE(total_xp, 0) AS total_xp,
                COALESCE(is_admin, false) AS is_admin
         FROM users
         WHERE username ILIKE $1 OR email_address ILIKE $1
         ORDER BY id DESC
         LIMIT 200`,
        [term],
      );
    } else {
      result = await pool.query(
        `SELECT external_id, username, email_address,
                COALESCE(role, 'FREE') AS role,
                COALESCE(account_tier, 0) AS account_tier,
                COALESCE(level, 1) AS level,
                COALESCE(total_xp, 0) AS total_xp,
                COALESCE(is_admin, false) AS is_admin
         FROM users
         ORDER BY id DESC
         LIMIT 200`,
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("[ADMIN USERS]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
