// Keep this file in sync with zenith-mobile/src/screens/ReleaseNotesScreen.js
// (different schema — tag/type field name and version format both differ
// slightly, but the entries themselves should match).
// Newest version first.

export const CHANGELOG = [
  {
    version: "1.2",
    date: "2026-09-07",
    title: "Leaderboard, Pause, and Fixes",
    entries: [
      { type: "new", text: "Weekly Leaderboard — compete with friends, family, or partners for the most active days this week and earn Credits for topping your circle" },
      { type: "new", text: "Pause a session mid-way and pick up right where you left off, within a time limit based on your tier" },
      { type: "new", text: "Get notified the moment a session finishes, so you never miss collecting your reward" },
      { type: "new", text: "The Streak widget can now be added to your Lock Screen, not just your Home Screen" },
      { type: "new", text: "Skill icons now match what they actually represent, instead of abstract shapes you had to memorize" },
      { type: "fix", text: "Fixed themes sometimes carrying over when switching accounts on a shared device" },
      { type: "fix", text: "Fixed onboarding sometimes rendering incorrectly on first launch" },
      { type: "fix", text: "Fixed an issue where overlapping sessions could award extra credit" },
      { type: "fix", text: "Fixed accepting a mutual friend request creating a duplicate entry" },
      { type: "fix", text: "Fixed starting a session requiring you to remember which category your skill was hidden under to select it" },
      { type: "change", text: "New app icon and logo! The old one had an extremely similar design as Google Gemini! Same design but different colors!" },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-01",
    title: "Prestige, Rebuilt",
    entries: [
      { type: "new",    text: "Prestige is now available on every tier — resetting a maxed skill also unlocks permanent Red Zone immunity for it, no subscription required" },
      { type: "new",    text: "Share your Prestige moments straight from the celebration screen" },
      { type: "new",    text: "Last 7 Days — a quick strip on the Dashboard showing which days you completed a session" },
      { type: "fix",    text: "Fixed session-complete UI pipeline to feel way smoother!" },
      { type: "fix",    text: "Fixed streak counting being inaccurate for some timezones." },
      { type: "fix",    text: "The Loot Drop UI has been improved for smoother visibility and accessibility." },
      { type: "change", text: "Refreshed overall rank names!" },
      { type: "change", text: "The skill Execution got renamed to Momentum." },
    ],
  },
  {
    version: "1.0",
    date: "2026-06-08",
    title: "Initial Release",
    entries: [
      { type: "new",  text: "Session-based XP and credit economy" },
      { type: "new",  text: "12 skills with prestige system" },
      { type: "new",  text: "Loot drop system with rarity tiers" },
      { type: "new",  text: "Neural Clock — time-based reward multipliers" },
      { type: "new",  text: "Daily challenge with credit reward" },
      { type: "new",  text: "Solar backdrop — live sky based on time of day" },
      { type: "new",  text: "Themes in the shop" },
      { type: "new",  text: "History — session history and skill XP breakdown" },
    ],
  },
];
