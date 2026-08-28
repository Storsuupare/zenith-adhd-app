const cron = require("node-cron");
const pool = require("../lib/db.js");
const { sendExpoPushToUser } = require("../lib/push.js");

function registerStreakAtRisk() {
cron.schedule("0 * * * *", async () => {
  try {
    const atRisk = await pool.query(
      `SELECT users.id, users.streak
       FROM users
       WHERE users.streak > 0
         AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))) = 19
         AND NOT EXISTS (
           SELECT 1 FROM tasks
           WHERE tasks.user_id = users.id::text
             AND tasks.completed_at >= (CURRENT_TIMESTAMP AT TIME ZONE COALESCE(users.timezone, 'UTC'))::date
         )`,
    );
    if (!atRisk.rows.length) return;

    for (const user of atRisk.rows) {
      await sendExpoPushToUser(user.id, {
        title: "Zenith",
        body:  `🔥 Day ${user.streak} streak — still time to keep it alive before REDZONE in 5 hours.`,
      });
    }

    console.log(`Streak alert sent to ${atRisk.rows.length} user(s)`);
  } catch (err) {
    console.error("Streak alert cron error:", err.message);
  }
});
}

module.exports = { registerStreakAtRisk };
