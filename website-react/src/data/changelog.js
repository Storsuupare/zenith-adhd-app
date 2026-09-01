// Keep this file in sync with zenith-mobile/src/screens/ReleaseNotesScreen.js
// (different schema — tag/type field name and version format both differ
// slightly, but the entries themselves should match).
// Newest version first.

export const CHANGELOG = [
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
