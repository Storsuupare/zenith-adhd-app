// Shared ref objects that any screen can assign to, and OnboardingModal can
// read from. This lets the onboarding spotlight elements in other tab screens
// (Shop, Settings) without needing a full React context.
const onboardingRefs = {
  shopContent:    { current: null },
  neuralClock:    { current: null },
  settingsScroll: { current: null }, // Settings ScrollView, so OnboardingModal can scroll to a section before measuring it
  neuralClockY:   { current: null }, // neuralClock's Y offset within that ScrollView's content, captured via onLayout
};

export default onboardingRefs;
