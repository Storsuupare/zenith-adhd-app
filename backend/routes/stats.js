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

// ── Insights — best hour, top skill, 90-day activity heatmap — PRO/ELITE only ──
// best_hour is extracted in server/UTC time, same as PEAK_HOURS/HYPERFOCUS_HOURS
// in achievementService.js — no per-user timezone conversion, matching how the
// Neural Clock itself is one shared clock for every user.
router.get("/api/stats/insights", requireAuth, async (req, res) => {
  const clerk_id = req.auth.userId;
  try {
    const userRes = await pool.query(
      "SELECT id, COALESCE(account_tier, 0) AS account_tier FROM users WHERE external_id = $1",
      [clerk_id],
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "USER_NOT_FOUND" });
    const { id: userId, account_tier: accountTier } = userRes.rows[0];

    if (accountTier < 1) {
      return res.status(403).json({ error: "UPGRADE_REQUIRED", message: "Insights requires PRO or ELITE." });
    }

    const [summaryRes, heatmapRes] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT EXTRACT(HOUR FROM completed_at)::int AS hour
              FROM tasks
              WHERE user_id::text = $1::text AND status = 'SUCCESS' AND credited_minutes > 0
              GROUP BY hour
              ORDER BY COUNT(*) DESC
              LIMIT 1)                                   AS best_hour,
           (SELECT skills.name
              FROM tasks
              JOIN skills ON skills.id = tasks.skill_id
              WHERE tasks.user_id::text = $1::text AND tasks.status = 'SUCCESS'
                AND tasks.completed_at >= date_trunc('month', NOW())
              GROUP BY skills.name
              ORDER BY SUM(tasks.credited_minutes) DESC
              LIMIT 1)                                   AS top_skill_this_month`,
        [String(userId)],
      ),
      // daily_stats only gets a row on days with a completed session, so a
      // plain SELECT would leave gaps. generate_series + LEFT JOIN guarantees
      // one row per day for the full 90-day window, same fill-the-gaps
      // pattern /api/stats/elevation already uses for its 7-day window.
      pool.query(
        `SELECT
           date_series.day::date                      AS date,
           COALESCE(daily_stats.focus_minutes, 0)::int AS focus_minutes
         FROM generate_series(CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE, INTERVAL '1 day') AS date_series(day)
         LEFT JOIN daily_stats ON daily_stats.user_id = $1::int AND daily_stats.date = date_series.day::date
         ORDER BY date_series.day ASC`,
        [userId],
      ),
    ]);

    res.json({
      best_hour:            summaryRes.rows[0]?.best_hour ?? null,
      top_skill_this_month: summaryRes.rows[0]?.top_skill_this_month ?? null,
      heatmap:              heatmapRes.rows,
    });
  } catch (err) {
    console.error("INSIGHTS_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
