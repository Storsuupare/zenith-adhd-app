// Mirrors zenith-mobile/src/components/DailyChallenge.js exactly — same array,
// same day-selection formula (just pinned to UTC instead of device-local time,
// matching how every other "once per day" check in this backend already works).
// Keep both files in sync if the challenge list ever changes.
const CHALLENGES = [
  { text: "Complete 3 sessions today", target: 3,  metric: "sessions" },
  { text: "Log 60 minutes of focus",   target: 60, metric: "minutes"  },
  { text: "Log 30 minutes of focus",   target: 30, metric: "minutes"  },
  { text: "Train 3 different skills",  target: 3,  metric: "skills"   },
  { text: "Complete 5 sessions today", target: 5,  metric: "sessions" },
  { text: "Log 90 minutes of focus",   target: 90, metric: "minutes"  },
  { text: "Log 60 minutes of focus",   target: 60, metric: "minutes"  },
];

function getTodayChallenge() {
  const now = new Date();
  const startOfYearUtc = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((Date.now() - startOfYearUtc) / 86_400_000);
  return CHALLENGES[day % CHALLENGES.length];
}

module.exports = { CHALLENGES, getTodayChallenge };
