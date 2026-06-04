// Single source of truth for release notes.
// Add new entries at the TOP of the array (newest first).
// Bumping CHANGELOG[0].version automatically triggers the unread dot in the nav.

export const CHANGELOG = [
  {
    version: "0.9",
    date: "2026-05-23",
    title: "The Prestige Update",
    entries: [
      {
        type: "new",
        text: "Prestige cinematic — hitting prestige on a skill now triggers a full-screen reveal showing your prestige rank, how much you earned, and your permanent XP boost. It feels like the moment it should.",
      },
      {
        type: "new",
        text: "Prestige credits now scale with how many times you've done it. Your first prestige pays 3,500 CR. Your second pays 7,000 CR. Your third pays 10,500 CR. The longer you commit, the bigger the payout.",
      },
      {
        type: "new",
        text: "24-hour 2× XP boost after prestige — the skill you just reset earns double XP for the next 24 hours. Makes the grind back feel like a sprint instead of starting over.",
      },
      {
        type: "new",
        text: "Prestige stars — gold ★ icons now appear on each skill card showing how many times you've prestiged it. Up to five stars.",
      },
      {
        type: "new",
        text: "Boost indicator — when the 24-hour post-prestige boost is active, a gold '2×' tag appears next to the skill name so you always know when to grind.",
      },
      {
        type: "new",
        text: "Consumables in the Shop — Streak Rescue (500 CR) restores your streak if you missed a day. Extra Loot Pull (250 CR) rolls a bonus loot drop immediately. Both apply the moment you buy them.",
      },
      {
        type: "new",
        text: "Onboarding walkthrough — first-time users now get a guided tour of the app. Each step spotlights the part of the interface it's talking about and navigates you back to the dashboard when you're done.",
      },
      {
        type: "fix",
        text: "Prestige credits were showing the reward in the animation but not actually adding to your balance. Fixed — the credit update and the skill reset now happen together or not at all.",
      },
      {
        type: "fix",
        text: "Session summary was cutting off and overlapping on mobile phones. It now slides up from the bottom of the screen and stays fully visible regardless of screen size.",
      },
      {
        type: "fix",
        text: "The loot drop card was squishing 'Credit Drop' into a single word on narrow screens. Text and spacing are now correctly sized across all devices.",
      },
      {
        type: "change",
        text: "Neural Clock — the time-of-day reward system has been renamed from 'Adaptive Modifiers' to Neural Clock. Same system, name that actually means something. You can find the full schedule in Settings.",
      },
      {
        type: "change",
        text: "Red Zone timing corrected to 12AM–7AM everywhere. Some parts of the app were still showing 12AM–5AM which was wrong.",
      },
      {
        type: "change",
        text: "Your account tier now multiplies every credit reward you earn from sessions. FREE earns the base amount. PRO earns 1.5× per session. ELITE earns 2×. This stacks on top of your streak multiplier.",
      },
      {
        type: "change",
        text: "Loot drop frequency now scales with your tier. FREE players get a drop on 1 in 4 sessions. PRO on 1 in 2. ELITE on 3 in 4.",
      },
      {
        type: "change",
        text: "Daily bonus amounts updated — FREE 30 CR, PRO 120 CR, ELITE 250 CR. Claim it once every 24 hours from the dashboard.",
      },
      {
        type: "change",
        text: "Shop prices updated across all themes and audio tracks to better reflect the credit economy.",
      },
      {
        type: "removed",
        text: "Confusing 'signal conversion' copy removed from loot drop cards. It said nothing useful.",
      },
    ],
  },
];
