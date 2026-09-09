const cron = require("node-cron");
const pool = require("../lib/db.js");
const { sendExpoPushToUser } = require("../lib/push.js");
const { pushUserPatch } = require("../lib/realtime.js");

const WEEKLY_REWARD_CREDITS = 250;

// The leaderboard itself (routes/social.js) ranks each user against their own
// friends, not one global list, so "the winner" is a different set of people
// per user — there's no single query for "who's #1" the way a global
// leaderboard would have. Instead this ranks everyone against their own
// circle in one pass: `circles` builds, for every user, the list of people
// (themselves included) visible on their leaderboard, then RANK() computes
// each circle's placing at once rather than looping per user.
//
// Fires once, right after the week rolls over — matching the same
// `date_trunc('week', NOW())` boundary the leaderboard query itself uses, so
// "last week" here means exactly the period that just stopped being shown as
// "this week" in the app.
function registerLeaderboardReward() {
cron.schedule("5 0 * * 1", async () => {
  try {
    const weekStartRes = await pool.query(
      `SELECT (date_trunc('week', NOW()) - INTERVAL '7 days')::date AS week_start`,
    );
    const weekStart = weekStartRes.rows[0].week_start;

    const winnersRes = await pool.query(
      `WITH friend_pairs AS (
         SELECT requester_id AS owner_id, addressee_id AS friend_id FROM friendships WHERE status = 'ACCEPTED'
         UNION ALL
         SELECT addressee_id AS owner_id, requester_id AS friend_id FROM friendships WHERE status = 'ACCEPTED'
       ),
       circles AS (
         SELECT owner_id, friend_id AS member_id FROM friend_pairs
         UNION ALL
         SELECT DISTINCT owner_id, owner_id AS member_id FROM friend_pairs
       ),
       week_active_days AS (
         SELECT user_id, COUNT(*) AS active_days
         FROM daily_stats
         WHERE date >= $1 AND date < $1::date + INTERVAL '7 days'
           AND focus_minutes > 0
         GROUP BY user_id
       ),
       ranked AS (
         SELECT
           circles.owner_id,
           circles.member_id,
           COALESCE(week_active_days.active_days, 0) AS active_days,
           RANK() OVER (PARTITION BY circles.owner_id ORDER BY COALESCE(week_active_days.active_days, 0) DESC) AS rnk,
           COUNT(*) OVER (PARTITION BY circles.owner_id) AS circle_size
         FROM circles
         LEFT JOIN week_active_days ON week_active_days.user_id = circles.member_id
       )
       SELECT users.id, users.external_id, ranked.active_days
       FROM ranked
       JOIN users ON users.id = ranked.owner_id
       WHERE ranked.member_id = ranked.owner_id
         AND ranked.rnk = 1
         AND ranked.active_days > 0
         AND ranked.circle_size >= 2`,
      [weekStart],
    );

    let paidCount = 0;
    for (const winner of winnersRes.rows) {
      const insertRes = await pool.query(
        `INSERT INTO leaderboard_rewards (user_id, week_start, credits_awarded, active_days)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, week_start) DO NOTHING
         RETURNING id`,
        [winner.id, weekStart, WEEKLY_REWARD_CREDITS, winner.active_days],
      );
      if (insertRes.rowCount === 0) continue; // already paid — cron re-run

      await pool.query(
        `UPDATE users SET system_credits = COALESCE(system_credits, 0) + $1 WHERE id = $2`,
        [WEEKLY_REWARD_CREDITS, winner.id],
      );
      pushUserPatch(winner.external_id).catch(() => {});
      await sendExpoPushToUser(winner.id, {
        title: "You topped your leaderboard!",
        body:  `Most active days this week among your friends — +${WEEKLY_REWARD_CREDITS} Credits.`,
      });
      paidCount++;
    }

    console.log(`Leaderboard reward: ${paidCount} winner(s) paid for week of ${weekStart}`);
  } catch (err) {
    console.error("Leaderboard reward cron error:", err.message);
  }
}, { timezone: "UTC" });
}

module.exports = { registerLeaderboardReward };
