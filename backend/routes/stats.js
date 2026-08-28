const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");

const router = express.Router();

// ── Elevation Chart — 7-day focus stats ────────────────────────────────────
router.get("/api/stats/elevation", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;

  try {
    const elevRes = await pool.query(
      `SELECT
         date_series.day::date                            AS date,
         TO_CHAR(date_series.day, 'Dy')                    AS day,
         COALESCE(SUM(tasks.duration_minutes)::int, 0)     AS minutes
       FROM generate_series(
         CURRENT_DATE - INTERVAL '6 days',
         CURRENT_DATE,
         INTERVAL '1 day'
       ) AS date_series(day)
       LEFT JOIN tasks ON (
         tasks.completed_at::date = date_series.day::date
         AND tasks.user_id::text  = (SELECT id::text FROM users WHERE external_id = $1)
         AND tasks.status         = 'SUCCESS'
       )
       GROUP BY date_series.day
       ORDER BY date_series.day ASC`,
      [clerk_id],
    );
    res.json(elevRes.rows);
  } catch (err) {
    console.error("ELEVATION_FETCH_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Summit History — recent completed sessions ──────────────────────────────
router.get("/api/stats/summit-history", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;
  const { limit = 12 } = req.query;

  try {
    const tierRes = await pool.query(
      "SELECT COALESCE(account_tier, 0) AS account_tier FROM users WHERE external_id = $1",
      [clerk_id],
    );
    const accountTier = tierRes.rows[0]?.account_tier ?? 0;

    // History depth and row cap scale with tier.
    // FREE: 7 days / 50 rows. PRO: 6 months / 200 rows. ELITE: all time / 500 rows.
    const intervalClause = accountTier >= 2 ? "" : accountTier >= 1
      ? "AND tasks.completed_at >= NOW() - INTERVAL '6 months'"
      : "AND tasks.completed_at >= NOW() - INTERVAL '7 days'";
    const rowCap = accountTier >= 2 ? 500 : accountTier >= 1 ? 200 : 50;
    const safeLimit = Math.min(parseInt(limit) || 12, rowCap);

    const summitRes = await pool.query(
      `SELECT
         tasks.id,
         tasks.duration_minutes::int                    AS minutes,
         TO_CHAR(tasks.completed_at, 'Mon DD')          AS label,
         COALESCE(tasks.title, 'Mission')               AS title,
         COALESCE(skills.name, '')                      AS skill_name,
         tasks.completed_at
       FROM tasks
       JOIN users ON users.id::text = tasks.user_id::text
       LEFT JOIN skills ON skills.id = tasks.skill_id
       WHERE users.external_id = $1
         AND tasks.status       = 'SUCCESS'
         AND tasks.completed_at IS NOT NULL
         ${intervalClause}
         AND tasks.duration_minutes BETWEEN 1 AND 180
       ORDER BY tasks.completed_at DESC
       LIMIT $2`,
      [clerk_id, safeLimit],
    );
    res.json(summitRes.rows.reverse());
  } catch (err) {
    console.error("SUMMIT_HISTORY_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Session history CSV export — PRO/ELITE only ───────────────────────────────
router.get("/api/stats/export-csv", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;
  try {
    const tierRes = await pool.query(
      "SELECT COALESCE(account_tier, 0) AS account_tier FROM users WHERE external_id = $1",
      [clerk_id],
    );
    if ((tierRes.rows[0]?.account_tier ?? 0) < 1) {
      return res.status(403).json({ error: "UPGRADE_REQUIRED", message: "CSV export requires PRO." });
    }

    const exportRes = await pool.query(
      `SELECT
         TO_CHAR(tasks.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS date,
         COALESCE(tasks.title, 'Mission')                                    AS title,
         COALESCE(skills.name, '')                                           AS skill,
         tasks.duration_minutes::int                                         AS duration_minutes,
         tasks.stake_amount::int                                             AS xp_earned
       FROM tasks
       JOIN users ON users.id::text = tasks.user_id::text
       LEFT JOIN skills ON skills.id = tasks.skill_id
       WHERE users.external_id = $1
         AND tasks.status       = 'SUCCESS'
         AND tasks.completed_at IS NOT NULL
       ORDER BY tasks.completed_at DESC
       LIMIT 5000`,
      [clerk_id],
    );

    const header = "date,title,skill,duration_minutes,xp_earned\n";
    const rows   = exportRes.rows.map(row =>
      `${row.date},"${String(row.title).replace(/"/g, '""')}",${row.skill},${row.duration_minutes},${row.xp_earned}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"zenith-sessions.csv\"");
    res.send(header + rows);
  } catch (err) {
    console.error("CSV_EXPORT_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
