// Keep this file in sync with frontend/clerk-react/src/data/changelog.js
// Newest version first.

export const CHANGELOG = [
  {
    version: "1.1.0",
    date: "2026-06-17",
    title: "The Sky Update",
    description: "The sky is now alive. The solar backdrop no longer snaps between phases — it moves continuously with the clock, every minute of the day.",
    entries: [
      { type: "fix",    text: "The moon is finally a moon. Not three circles stacked on top of each other." },
      { type: "change", text: "Ghost is gone. Ember is here — copper, warm, and nothing like anything else in the shop." },
      { type: "change", text: "The session complete screen got a full rework. It actually feels like a reward now." },
      { type: "new",    text: "History has a real Performance section. 7-day stats, your top skill, daily average — all there without opening the app." },
      { type: "new",    text: "Your account page now shows what actually matters. Streak, credits, prestiges, and a proper way to manage or leave if you need to." },
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
      { type: "new",  text: "PRO and ELITE subscription tiers" },
      { type: "new",  text: "Themes and ambient audio in the shop" },
      { type: "new",  text: "History — session history and skill XP breakdown" },
    ],
  },
];
