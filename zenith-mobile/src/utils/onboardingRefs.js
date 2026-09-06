// Shared ref objects that any screen can assign to, and OnboardingModal can
// read from. OnboardingModal is mounted once at the navigator root (so it can
// stay visible across tab switches), not inside any one screen, so it has no
// direct prop access to a given screen's own refs/state — every spotlightable
// element and every scrollable container it needs to reach goes through here.
const onboardingRefs = {
  // Dashboard (Home tab)
  dashboardScroll: { current: null }, // main ScrollView, so OnboardingModal can scroll to a section before measuring it
  statHud:         { current: null },
  mission:         { current: null },
  contracts:       { current: null },
  skills:          { current: null },
  sectionYs:       { current: {} },   // Y offsets of the sections above, populated via onLayout

  // Shop tab
  shopContent: { current: null },

  // Settings tab (More > Settings)
  neuralClock:    { current: null },
  settingsScroll: { current: null }, // Settings ScrollView, so OnboardingModal can scroll to a section before measuring it
  neuralClockY:   { current: null }, // neuralClock's Y offset within that ScrollView's content, captured via onLayout
};

export default onboardingRefs;
