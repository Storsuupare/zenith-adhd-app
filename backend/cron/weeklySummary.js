const cron = require("node-cron");
const pool = require("../lib/db.js");
const { sendExpoPushToUser } = require("../lib/push.js");

function registerWeeklySummary() {
cron.schedule("0 * * * *", async () => {
  try {
    const results = await pool.query(
      `SELECT
         users.id,
         COUNT(tasks.id)::int                          AS session_count,
         COALESCE(SUM(tasks.duration_minutes), 0)::int AS total_minutes,
         top_skill.name                                AS top_skill
       FROM users
       JOIN tasks ON tasks.user_id = users.id::text
         AND tasks.completed_at >= NOW() - INTERVAL '7 days'
         AND tasks.status = 'SUCCESS'
       LEFT JOIN LATERAL (
         SELECT skills.name
         FROM tasks
         JOIN skills ON skills.id = tasks.skill_id
         WHERE tasks.user_id = users.id::text
           AND tasks.completed_at >= NOW() - INTERVAL '7 days'
           AND tasks.status = 'SUCCESS'
           AND tasks.skill_id IS NOT NULL
         GROUP BY skills.name
         ORDER BY COUNT(tasks.id) DESC
         LIMIT 1
       ) top_skill ON true
       WHERE EXTRACT(DOW  FROM (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))) = 0
         AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))) = 18
       GROUP BY users.id, top_skill.name
       HAVING COUNT(tasks.id) > 0`,
    );
    if (!results.rows.length) return;

    for (const row of results.rows) {
      const skillLine = row.top_skill ? ` Top skill: ${row.top_skill}.` : "";
      await sendExpoPushToUser(row.id, {
        title: "Zenith — Weekly Summary",
        body:  `${row.session_count} sessions · ${row.total_minutes} min focused.${skillLine}`,
      });
    }

    console.log(`Weekly summary sent to ${results.rows.length} user(s)`);
  } catch (err) {
    console.error("Weekly summary cron error:", err.message);
  }
});
}

module.exports = { registerWeeklySummary };
