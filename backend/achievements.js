// Achievement definitions live here rather than in a database table on purpose:
// the skills table drifting out of sync with the code is exactly the problem that
// v8_seed_skills.sql caused. Only unlocks are persisted (user_achievements) —
// definitions are code, served to the client so there is one source of truth.
//
// Wording is deliberately retroactive: "Completed 50 sessions", never "Complete 50
// sessions to unlock". These recognise what someone already did. Framing them as
// targets turns the screen into a chore list, which is the single most common
// reason this audience deletes an app.
//
// metric   — key on the stats object built by buildAchievementStats()
// threshold— value the stat must reach (>=)
// lootRarity — guaranteed loot roll awarded on unlock, or null for recognition only.
//              Credits still only ever originate from loot, never from the session itself.

const ACHIEVEMENTS = [
  // ── Sessions ────────────────────────────────────────────────────────────────
  { key: "sessions_1",    category: "Sessions", title: "First Light",      description: "Completed your first session.",        metric: "sessionsCompleted", threshold: 1,   lootRarity: null },
  { key: "sessions_10",   category: "Sessions", title: "Getting Traction", description: "Completed 10 sessions.",               metric: "sessionsCompleted", threshold: 10,  lootRarity: "Uncommon" },
  { key: "sessions_50",   category: "Sessions", title: "Momentum",         description: "Completed 50 sessions.",               metric: "sessionsCompleted", threshold: 50,  lootRarity: "Rare" },
  { key: "sessions_100",  category: "Sessions", title: "Triple Digits",    description: "Completed 100 sessions.",              metric: "sessionsCompleted", threshold: 100, lootRarity: "Epic" },
  { key: "sessions_500",  category: "Sessions", title: "Relentless",       description: "Completed 500 sessions.",              metric: "sessionsCompleted", threshold: 500, lootRarity: "Mythic" },

  // ── Focus time ──────────────────────────────────────────────────────────────
  { key: "minutes_60",    category: "Focus",    title: "One Hour Deep",    description: "Focused for a total of 1 hour.",       metric: "focusMinutes", threshold: 60,   lootRarity: null },
  { key: "minutes_600",   category: "Focus",    title: "Ten Hours In",     description: "Focused for a total of 10 hours.",     metric: "focusMinutes", threshold: 600,  lootRarity: "Rare" },
  { key: "minutes_3000",  category: "Focus",    title: "Fifty Hours",      description: "Focused for a total of 50 hours.",     metric: "focusMinutes", threshold: 3000, lootRarity: "Epic" },
  { key: "minutes_6000",  category: "Focus",    title: "The Hundred",      description: "Focused for a total of 100 hours.",    metric: "focusMinutes", threshold: 6000, lootRarity: "Legendary" },

  // ── Streaks ─────────────────────────────────────────────────────────────────
  { key: "streak_7",      category: "Streaks",  title: "One Week",         description: "Reached a 7-day streak.",              metric: "bestStreak", threshold: 7,   lootRarity: "Uncommon" },
  { key: "streak_14",     category: "Streaks",  title: "Fortnight",        description: "Reached a 14-day streak.",             metric: "bestStreak", threshold: 14,  lootRarity: "Rare" },
  { key: "streak_30",     category: "Streaks",  title: "A Full Month",     description: "Reached a 30-day streak.",             metric: "bestStreak", threshold: 30,  lootRarity: "Epic" },
  { key: "streak_60",     category: "Streaks",  title: "Two Months",       description: "Reached a 60-day streak.",             metric: "bestStreak", threshold: 60,  lootRarity: "Legendary" },
  { key: "streak_100",    category: "Streaks",  title: "Century Streak",   description: "Reached a 100-day streak.",            metric: "bestStreak", threshold: 100, lootRarity: "Mythic" },

  // ── Skills ──────────────────────────────────────────────────────────────────
  { key: "skill_25",      category: "Skills",   title: "Specialist",       description: "Took a skill to level 25.",            metric: "highestSkillLevel", threshold: 25, lootRarity: "Uncommon" },
  { key: "skill_50",      category: "Skills",   title: "Expert",           description: "Took a skill to level 50.",            metric: "highestSkillLevel", threshold: 50, lootRarity: "Rare" },
  { key: "skill_99",      category: "Skills",   title: "Mastery",          description: "Took a skill to level 99.",            metric: "highestSkillLevel", threshold: 99, lootRarity: "Legendary" },
  { key: "skills_all_10", category: "Skills",   title: "Well Rounded",     description: "Every skill above level 10.",          metric: "skillsAboveTen",    threshold: 12, lootRarity: "Epic" },
  { key: "prestige_1",    category: "Skills",   title: "Second Ascent",    description: "Prestiged a skill for the first time.", metric: "prestigeTotal",    threshold: 1,  lootRarity: "Epic" },

  // ── Neural Clock ────────────────────────────────────────────────────────────
  { key: "peak_10",       category: "Rhythm",   title: "Morning Person",   description: "Completed 10 sessions in the Peak window.",       metric: "peakSessions",       threshold: 10, lootRarity: "Uncommon" },
  { key: "peak_50",       category: "Rhythm",   title: "Dawn Regular",     description: "Completed 50 sessions in the Peak window.",       metric: "peakSessions",       threshold: 50, lootRarity: "Rare" },
  { key: "hyper_10",      category: "Rhythm",   title: "Night Shift",      description: "Completed 10 sessions in the Hyperfocus window.", metric: "hyperfocusSessions", threshold: 10, lootRarity: "Uncommon" },
  { key: "hyper_50",      category: "Rhythm",   title: "Late Bloomer",     description: "Completed 50 sessions in the Hyperfocus window.", metric: "hyperfocusSessions", threshold: 50, lootRarity: "Rare" },

  // ── Collection ──────────────────────────────────────────────────────────────
  { key: "themes_1",      category: "Collection", title: "New Look",       description: "Unlocked your first theme.",           metric: "themesOwned", threshold: 1,  lootRarity: null },
  { key: "themes_5",      category: "Collection", title: "Curator",        description: "Unlocked 5 themes.",                   metric: "themesOwned", threshold: 5,  lootRarity: "Rare" },
  { key: "themes_all",    category: "Collection", title: "Full Spectrum",  description: "Unlocked every theme.",                metric: "themesOwned", threshold: 12, lootRarity: "Legendary" },
];

const ACHIEVEMENTS_BY_KEY = new Map(ACHIEVEMENTS.map(entry => [entry.key, entry]));

module.exports = { ACHIEVEMENTS, ACHIEVEMENTS_BY_KEY };
