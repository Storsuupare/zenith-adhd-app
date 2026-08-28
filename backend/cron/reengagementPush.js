const cron = require("node-cron");
const pool = require("../lib/db.js");
const { sendExpoPushToUser } = require("../lib/push.js");
const { isEligibleForReengagementPush } = require("../lib/economy.js");

// Users with no streak left get nothing from the streak-reaper or streak-at-risk
// jobs, so someone who's fully lapsed currently hears nothing at all.
// reengagement_push_sent gates this to once per absence — it resets to false the
// moment they complete another session (see the session-completion UPDATE).
function registerReengagementPush() {
cron.schedule("0 * * * *", async () => {
  try {
    const candidates = await pool.query(
      `SELECT users.id,
              FLOOR(EXTRACT(EPOCH FROM (NOW() - streak_last_updated)) / 86400)::int AS days_since_last_session
       FROM users
       WHERE streak_last_updated IS NOT NULL
         AND reengagement_push_sent = false
         AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(users.timezone, 'UTC'))) = 12`,
    );

    const lapsedUsers = candidates.rows.filter(u => isEligibleForReengagementPush(u.days_since_last_session));
    if (!lapsedUsers.length) return;

    for (const user of lapsedUsers) {
      await sendExpoPushToUser(user.id, {
        title: "Zenith",
        body:  "Your skills have been sitting exactly where you left them. One session gets you back in it.",
      });
    }

    await pool.query(
      `UPDATE users SET reengagement_push_sent = true WHERE id = ANY($1::int[])`,
      [lapsedUsers.map(u => u.id)],
    );

    console.log(`Re-engagement push sent to ${lapsedUsers.length} user(s)`);
  } catch (err) {
    console.error("Re-engagement push cron error:", err.message);
  }
});
}

module.exports = { registerReengagementPush };
