const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { mutationLimiter } = require("../lib/rateLimiters.js");
const { TIER_MAX_TEMPLATES } = require("../lib/economy.js");
const { VALID_DURATIONS } = require("../lib/validation.js");

const router = express.Router();

router.get("/api/task-templates", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (userRes.rows.length === 0) return res.json([]);

    const templatesRes = await pool.query(
      `SELECT task_templates.*, skills.name AS skill_name
       FROM task_templates
       LEFT JOIN skills ON skills.id = task_templates.skill_id
       WHERE task_templates.user_id = $1
       ORDER BY task_templates.created_at ASC`,
      [userRes.rows[0].id],
    );
    res.json(templatesRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/task-templates", requireAuth, mutationLimiter, async (req, res) => {
  const { taskName, durationMinutes, skillName } = req.body;
  const externalId = req.auth.userId;

  if (!taskName || typeof taskName !== "string" || taskName.trim().length === 0 || taskName.length > 200)
    return res.status(400).json({ error: "Task name must be 1–200 characters" });

  const parsedDuration = parseInt(durationMinutes);
  if (!VALID_DURATIONS.has(parsedDuration)) {
    return res.status(400).json({ error: "Duration must be 5, 15, 30, 60, 90, or 120 minutes" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      "SELECT id, COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE external_id = $1",
      [externalId],
    );
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const { id: internalUserId, account_tier: cTier, role: cRole } = userRes.rows[0];

    // Templates are the one thing that stays tier-gated on purpose — unlike
    // Prestige, this never touches XP, loot, or progression, it's pure
    // convenience, same category as task slots and history depth.
    const templateMaxLimit = cRole === "ADMIN" ? Infinity : (TIER_MAX_TEMPLATES[cTier] ?? 0);
    if (templateMaxLimit <= 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "UPGRADE_REQUIRED",
        message: "Task templates require PRO or ELITE.",
      });
    }
    if (templateMaxLimit !== Infinity) {
      const countRes = await client.query(
        "SELECT COUNT(*) FROM task_templates WHERE user_id = $1",
        [internalUserId],
      );
      if (parseInt(countRes.rows[0].count) >= templateMaxLimit) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "TEMPLATE_LIMIT_REACHED",
          message: `You've reached your ${templateMaxLimit}-template limit. Upgrade to ELITE for unlimited templates.`,
        });
      }
    }

    let targetSkillId = null;
    let resolvedSkillName = null;

    // Skill lookup with fallback to "Resolve" if not found — same pattern as
    // task creation.
    if (skillName) {
      const targetSkillRes = await client.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        [skillName],
      );
      if (targetSkillRes.rows[0]?.id) {
        targetSkillId = targetSkillRes.rows[0].id;
        resolvedSkillName = targetSkillRes.rows[0].name;
      } else {
        const fallbackRes = await client.query(
          "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
          ["Resolve"],
        );
        if (fallbackRes.rows[0]) {
          targetSkillId = fallbackRes.rows[0].id;
          resolvedSkillName = fallbackRes.rows[0].name;
        }
      }
    } else {
      const defaultRes = await client.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        ["Resolve"],
      );
      if (defaultRes.rows[0]) {
        targetSkillId = defaultRes.rows[0].id;
        resolvedSkillName = defaultRes.rows[0].name;
      }
    }

    const insertRes = await client.query(
      `INSERT INTO task_templates (user_id, task_name, skill_id, duration_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [internalUserId, taskName.trim(), targetSkillId, parsedDuration],
    );

    await client.query("COMMIT");
    res.status(201).json({ ...insertRes.rows[0], skill_name: resolvedSkillName });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/api/task-templates/:id", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE external_id = $1", [externalId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const deleteRes = await pool.query(
      "DELETE FROM task_templates WHERE id = $1 AND user_id = $2",
      [id, userRes.rows[0].id],
    );
    if (deleteRes.rowCount === 0) return res.status(404).json({ error: "TEMPLATE_NOT_FOUND" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
