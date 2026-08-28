const cron = require("node-cron");
const pool = require("../lib/db.js");
const { pushUserPatch } = require("../lib/realtime.js");
const { sendExpoPushToUser } = require("../lib/push.js");

function registerSessionExpiry() {
cron.schedule("*/5 * * * *", async () => {
  try {
    // ── Warning: deadline passed 23–27 min ago (5-min window centred on 25 min) ──
    const warned = await pool.query(
      `SELECT tasks.id, tasks.title, tasks.user_id, users.id AS db_user_id
       FROM tasks
       JOIN users ON users.id::text = tasks.user_id::text
       WHERE tasks.status  = 'ACTIVE'
         AND tasks.deadline < NOW() - INTERVAL '23 minutes'
         AND tasks.deadline > NOW() - INTERVAL '27 minutes'`,
    );
    for (const task of warned.rows) {
      await sendExpoPushToUser(task.db_user_id, {
        title: "Session expiring...⚠️",
        body:  `"${task.title}" — 5 minutes to collect your reward before it's gone.`,
      });
    }

    // ── Halfway ping: soft check-in at the midpoint of sessions 15+ minutes long.
    // 5-minute sessions are excluded — too short for a mid-session nudge to make sense.
    // Not sent if ignored — this never fails or penalizes the session, it's a nudge only.
    const halfway = await pool.query(
      `UPDATE tasks
       SET halfway_ping_sent = true
       WHERE status = 'ACTIVE'
         AND halfway_ping_sent = false
         AND duration_minutes != 5
         AND deadline - ((duration_minutes * 0.5)::text || ' minutes')::interval <= NOW()
       RETURNING id, title, user_id,
                 (SELECT id FROM users WHERE id::text = user_id::text) AS db_user_id`,
    );
    // Cap actual pushes at 3 per user per day — tasks beyond the cap are still marked
    // halfway_ping_sent above (so they're never re-checked), they just don't send a push.
    // Prevents heavy users from getting buzzed every single session they run.
    const HALFWAY_PING_DAILY_CAP = 3;
    const halfwayUserIds = [...new Set(halfway.rows.map(halfwayTask => halfwayTask.db_user_id))];
    const priorPingCounts = new Map();
    if (halfwayUserIds.length) {
      const priorCountsRes = await pool.query(
        `SELECT user_id::int AS db_user_id, COUNT(*)::int AS ping_count
         FROM tasks
         WHERE halfway_ping_sent = true
           AND deadline::date = CURRENT_DATE
           AND user_id::int = ANY($1::int[])
           AND id <> ALL($2::int[])
         GROUP BY user_id`,
        [halfwayUserIds, halfway.rows.map(halfwayTask => halfwayTask.id)],
      );
      for (const row of priorCountsRes.rows) priorPingCounts.set(row.db_user_id, row.ping_count);
    }

    for (const task of halfway.rows) {
      try {
        const pingsToday = priorPingCounts.get(task.db_user_id) ?? 0;
        if (pingsToday >= HALFWAY_PING_DAILY_CAP) continue;
        priorPingCounts.set(task.db_user_id, pingsToday + 1);

        await sendExpoPushToUser(task.db_user_id, {
          title: "Halfway there ⚡",
          body:  `You're half done with "${task.title}" — keep going.`,
        });
      } catch (perTaskErr) {
        console.error(`Session expiry: halfway ping failed for task ${task.id}:`, perTaskErr.message);
      }
    }

    // ── Auto-fail: deadline passed more than 30 min ago ──
    const abandoned = await pool.query(
      `UPDATE tasks
       SET status = 'FAILED'
       WHERE status  = 'ACTIVE'
         AND deadline < NOW() - INTERVAL '30 minutes'
       RETURNING id, title, user_id,
                 (SELECT id FROM users WHERE id::text = user_id::text) AS db_user_id,
                 (SELECT external_id FROM users WHERE id::text = user_id::text) AS external_id`,
    );
    for (const task of abandoned.rows) {
      try {
        await pool.query("UPDATE users SET strikes = COALESCE(strikes, 0) + 1 WHERE id = $1", [task.db_user_id]);
        pushUserPatch(task.external_id).catch(() => {});
        await sendExpoPushToUser(task.db_user_id, {
          title: "Reward missed 😩",
          body:  `"${task.title}" timed out before you collected it — grab the next one.`,
        });
      } catch (perTaskErr) {
        console.error(`Session expiry: strike/notify failed for task ${task.id}:`, perTaskErr.message);
      }
    }

    if (warned.rows.length || abandoned.rows.length || halfway.rows.length) {
      console.log(`Session expiry: ${halfway.rows.length} halfway pinged, ${warned.rows.length} warned, ${abandoned.rows.length} auto-failed`);
    }
  } catch (err) {
    console.error("Session expiry cron error:", err.message);
  }
});
}

module.exports = { registerSessionExpiry };
