// Shared ref objects that any screen can assign to, and OnboardingModal can
// read from. This lets the onboarding spotlight elements in other tab screens
// (Shop, Settings) without needing a full React context.
const onboardingRefs = {
  shopContent: { current: null },
  neuralClock: { current: null },
};

export default onboardingRefs;
