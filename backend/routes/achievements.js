const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { ACHIEVEMENTS, buildAchievementStats } = require("../achievementService.js");

const router = express.Router();

// Returns every achievement definition with the caller's unlock state attached.
// Definitions are served rather than duplicated in the app so there is one source
// of truth, and so adding an achievement needs no new mobile build.
router.get("/achievements", requireAuth, async (req, res) => {
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [req.auth.userId]);
    if (!userRes.rows[0]) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const userId = userRes.rows[0].id;
    const [unlockedRes, achievementStats] = await Promise.all([
      pool.query(
        "SELECT achievement_key, unlocked_at FROM user_achievements WHERE user_id = $1",
        [userId],
      ),
      buildAchievementStats(userId, pool),
    ]);
    const unlockedByKey = new Map(unlockedRes.rows.map(row => [row.achievement_key, row.unlocked_at]));

    res.json({
      unlocked_count: unlockedByKey.size,
      total_count:    ACHIEVEMENTS.length,
      achievements:   ACHIEVEMENTS.map(definition => ({
        key:         definition.key,
        category:    definition.category,
        title:       definition.title,
        description: definition.description,
        lootRarity:  definition.lootRarity,
        threshold:   definition.threshold,
        progress:    Math.min(achievementStats[definition.metric] ?? 0, definition.threshold),
        unlocked_at: unlockedByKey.get(definition.key) ?? null,
      })),
    });
  } catch {
    res.status(500).json({ error: "DATABASE_ERROR" });
  }
});

module.exports = router;
