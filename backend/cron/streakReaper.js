const cron = require("node-cron");
const pool = require("../lib/db.js");
const { pushUserPatch } = require("../lib/realtime.js");
const { sendExpoPushToUser } = require("../lib/push.js");

function registerStreakReaper() {
cron.schedule("0 * * * *", async () => {
  try {
    // A "missed day" is defined by the user's own local calendar date, not a
    // rolling 24-hour window — matching the streak-increment logic in
    // routes/tasks.js exactly. A gap of 2+ local calendar days between
    // streak_last_updated and now means at least one full day passed with no
    // completion (day N -> day N+1 is still "today" for them; day N+2 means
    // day N+1 came and went with nothing logged).
    const expired = await pool.query(
      `SELECT id, external_id, username, streak, streak_shield, streak_in_grace
       FROM users
       WHERE streak > 0
         AND DATE(NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))
           - DATE(streak_last_updated AT TIME ZONE COALESCE(timezone, 'UTC')) >= 2`,
    );
    if (!expired.rows.length) return;

    // Split into three groups — each gets different treatment.
    // Shielded users take priority: shield absorbs the miss, grace doesn't apply.
    // Unshielded users entering grace for the first time get a 24h buffer.
    // Users already in grace who missed again get a full reset.
    const shieldedUsers   = expired.rows.filter(u => u.streak_shield);
    const enterGraceUsers = expired.rows.filter(u => !u.streak_shield && !u.streak_in_grace);
    const resetUsers      = expired.rows.filter(u => !u.streak_shield && u.streak_in_grace);

    // Shielded: consume shield, reset the 24h window, streak count preserved.
    if (shieldedUsers.length) {
      await pool.query(
        `UPDATE users
         SET streak_shield = false, streak_last_updated = NOW()
         WHERE id = ANY($1::int[])`,
        [shieldedUsers.map(u => u.id)],
      );
    }

    // Entering grace: freeze the streak count, give another 24h to come back.
    // streak_last_updated = NOW() restarts the 24h clock from this moment.
    if (enterGraceUsers.length) {
      await pool.query(
        `UPDATE users
         SET streak_in_grace = true, streak_last_updated = NOW()
         WHERE id = ANY($1::int[])`,
        [enterGraceUsers.map(u => u.id)],
      );
    }

    // Already in grace and missed again — reset for real.
    if (resetUsers.length) {
      await pool.query(
        `UPDATE users
         SET streak = 0, streak_in_grace = false
         WHERE id = ANY($1::int[])`,
        [resetUsers.map(u => u.id)],
      );
    }

    for (const u of expired.rows) {
      try {
        pushUserPatch(u.external_id).catch(() => {});
        if (u.streak_shield) {
          await sendExpoPushToUser(u.id, {
            title: "Streak Shield used",
            body:  `Your ${u.streak}-day streak was protected. Complete a session today to keep it.`,
          });
        } else if (!u.streak_in_grace) {
          // First miss — entering grace. Encouraging, not alarming — the title
          // should say the streak is safe, not name the internal mechanism.
          await sendExpoPushToUser(u.id, {
            title: "Streak on hold",
            body:  `Your ${u.streak}-day streak is on hold. Complete one session today to keep it.`,
          });
        } else {
          // Was in grace, missed again — streak resets.
          await sendExpoPushToUser(u.id, {
            title: "Streak reset",
            body:  `${u.streak} days was solid. Come back whenever you're ready.`,
          });
        }
      } catch (perUserErr) {
        console.error(`Streak reaper: notify failed for user ${u.id}:`, perUserErr.message);
      }
    }

    console.log(`Streak reaper: shielded ${shieldedUsers.length}, grace ${enterGraceUsers.length}, reset ${resetUsers.length}`);
  } catch (err) {
    console.error("Streak reaper error:", err.message);
  }
});
}

module.exports = { registerStreakReaper };
