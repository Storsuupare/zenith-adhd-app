const { registerStreakReaper } = require("./streakReaper.js");
const { registerSessionExpiry } = require("./sessionExpiry.js");
const { registerStreakAtRisk } = require("./streakAtRisk.js");
const { registerWeeklySummary } = require("./weeklySummary.js");
const { registerReengagementPush } = require("./reengagementPush.js");

// Called once from server.js, guarded by require.main === module there —
// each register*() call just schedules its cron job, it doesn't check the
// guard itself (that check only means anything relative to the actual entry
// script, i.e. server.js, not whichever file it's literally written in).
function registerCronJobs() {
  registerStreakReaper();
  registerSessionExpiry();
  registerStreakAtRisk();
  registerWeeklySummary();
  registerReengagementPush();
}

module.exports = { registerCronJobs };
