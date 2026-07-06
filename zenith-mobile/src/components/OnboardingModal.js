import React, { useState, useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Dimensions, Animated, PanResponder,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPOTLIGHT_PADDING   = 12;  // gap between element edge and the spotlight ring
const SCROLL_SETTLE_DELAY = 380; // ms to wait after scroll before measuring

// Max height of any spotlight cutout. Prevents a huge element (like the full
// skills grid) from consuming the whole screen and leaving no room for the card.
const MAX_SPOTLIGHT_HEIGHT = 160;

// Estimated card height used to decide whether the card fits above or below
// the spotlight without going off screen.
const ESTIMATED_CARD_HEIGHT = 320;

// ── Step definitions ──────────────────────────────────────────────────────────
// scrollTo           — key in sectionRefs / sectionYs (Dashboard sections)
// scrollToCenter     — when true, scrolls the element to vertical screen center
//                      so there is room above it for the card (used for skills)
// navigateTo         — tab name to switch to when pressing Next
// crossTabSpotlightKey — key in onboardingRefs to measure after tab switch
const STEPS = [
  {
    id: "welcome",
    icon: "⬡",
    title: "Welcome to Zenith",
    body: "Turn what you're already doing into a game. Every session earns XP and credits. Maintain your streak to earn bonus credits and unlock milestone rewards.",
  },
  {
    id: "stathud",
    scrollTo: "statHud",
    icon: "◈",
    title: "Your stats",
    body: "Your level, XP, streak, and credits are all at the top. Credits come from completing sessions and get spent in the shop.",
  },
  {
    id: "missions",
    scrollTo: "mission",
    icon: "▣",
    title: "Start a session",
    body: "Name what you're working on, pick a duration, and hit go. Longer sessions pay more. Quit early and your reward gets cut.",
  },
  {
    id: "contracts",
    scrollTo: "contracts",
    icon: "◆",
    title: "Active sessions",
    body: "Running sessions show up with a live countdown. Hit Collect when the timer runs out. Finish one and you might earn a loot drop.",
  },
  {
    id: "skills",
    scrollTo: "skills",
    scrollToCenter: true,  // brings skills to mid-screen so card fits above
    icon: "⬢",
    title: "12 skills to grow",
    body: "You pick the skill before each session. Focus, Logic, Creativity and more. Hit level 99 to Prestige — the skill resets but you keep a permanent XP bonus.",
  },
  {
    id: "shop",
    navigateTo: "Shop",
    crossTabSpotlightKey: "shopContent",
    icon: "◈",
    title: "The shop",
    body: "Spend credits on themes. Each one changes the entire sky — from cosmic Nebula to cyberpunk Neon. PRO and ELITE unlock the full catalog.",
  },
  {
    id: "guardian",
    navigateTo: "Profile",
    crossTabSpotlightKey: "neuralClock",
    icon: "▲",
    title: "Neural Clock",
    body: "Rewards shift with the time of day. Late nights (12AM–7AM) pay half. Your sharpest hours (8–11AM) give peak XP. The 10PM–12AM window is your hyperfocus zone.",
  },
  {
    id: "done",
    icon: "◌",
    title: "You're set.",
    body: "Pick something to work on and start your first session. The rest you'll figure out as you go. Just start.",
  },
];

export const ONBOARDING_KEY = (userId) => `zenith_onboarded_${userId}`;

export default function OnboardingModal({
  visible,
  userId,
  onClose,
  navigation,
  scrollRef,
  sectionYs,
  sectionRefs,
}) {
  const { accentColor } = useTheme() || {};
  const activeAccentColor = accentColor || COLORS.accent;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlight, setSpotlight]               = useState(null);

  const currentStep = STEPS[currentStepIndex];
  const isLastStep  = currentStepIndex === STEPS.length - 1;

  // ── Drag card ────────────────────────────────────────────────────────────────
  const cardDragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const dragHandler = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        cardDragPosition.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: cardDragPosition.x, dy: cardDragPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        cardDragPosition.flattenOffset();
      },
    })
  ).current;

  // ── Step change: reset drag, scroll, measure spotlight ───────────────────────
  useEffect(() => {
    if (!visible) return;

    cardDragPosition.setValue({ x: 0, y: 0 });
    cardDragPosition.setOffset({ x: 0, y: 0 });
    setSpotlight(null);

    // ── Cross-tab spotlight (Shop, Profile steps) ──────────────────────────
    // Navigation already happened in goToNextStep / goToPreviousStep.
    // We just need to wait for the other screen to settle, then measure.
    if (currentStep.crossTabSpotlightKey) {
      const crossTabTimer = setTimeout(() => {
        const targetRef = onboardingRefs[currentStep.crossTabSpotlightKey];
        if (!targetRef?.current) return;

        targetRef.current.measureInWindow((screenX, screenY, elementWidth, elementHeight) => {
          if (elementWidth === 0 || elementHeight === 0) return;
          setSpotlight({
            x:      screenX,
            y:      screenY,
            width:  elementWidth,
            height: Math.min(elementHeight, MAX_SPOTLIGHT_HEIGHT),
          });
        });
      }, SCROLL_SETTLE_DELAY + 200);

      return () => clearTimeout(crossTabTimer);
    }

    // ── Dashboard spotlight (Home steps with scrollTo) ─────────────────────
    if (!currentStep.scrollTo) return;

    const targetScrollY = sectionYs?.[currentStep.scrollTo];
    if (targetScrollY == null || !scrollRef?.current) return;

    // scrollToCenter: true brings the section to vertical screen-center so
    // there is room above it for the card. Used for tall sections like skills.
    const scrollOffsetY = currentStep.scrollToCenter
      ? Math.max(0, targetScrollY - SCREEN_HEIGHT * 0.5)
      : Math.max(0, targetScrollY - 16);

    scrollRef.current.scrollTo({ y: scrollOffsetY, animated: true });

    const measureTimer = setTimeout(() => {
      const targetRef = sectionRefs?.[currentStep.scrollTo];
      if (!targetRef?.current) return;

      targetRef.current.measureInWindow((screenX, screenY, elementWidth, elementHeight) => {
        if (elementWidth === 0 || elementHeight === 0) return;
        setSpotlight({
          x:      screenX,
          y:      screenY,
          width:  elementWidth,
          height: Math.min(elementHeight, MAX_SPOTLIGHT_HEIGHT),
        });
      });
    }, SCROLL_SETTLE_DELAY);

    return () => clearTimeout(measureTimer);
  }, [currentStepIndex, visible]);

  // ── Navigation helpers ────────────────────────────────────────────────────────
  function navigateForStep(step) {
    if (step.navigateTo) {
      navigation?.navigate(step.navigateTo);
    } else {
      navigation?.navigate("Home");
    }
  }

  const goToNextStep = async () => {
    if (isLastStep) {
      await AsyncStorage.setItem(ONBOARDING_KEY(userId), "1");
      navigation?.navigate("Home");
      onClose();
      return;
    }
    navigateForStep(STEPS[currentStepIndex + 1]);
    setCurrentStepIndex(index => index + 1);
  };

  const goToPreviousStep = () => {
    setSpotlight(null);
    navigateForStep(STEPS[currentStepIndex - 1]);
    setCurrentStepIndex(index => index - 1);
  };

  const skipOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY(userId), "1");
    navigation?.navigate("Home");
    onClose();
  };

  // ── Card container position ───────────────────────────────────────────────────
  // The container is always absoluteFill so the card remains touchable after
  // being dragged anywhere. The card's starting position is driven by padding.
  //
  // Priority:
  //   1. Fits below the spotlight → place below
  //   2. Fits above the spotlight → place above
  //   3. Neither fits (e.g. huge element near top) → pin to top-center
  function getCardContainerStyle() {
    if (!spotlight) {
      return styles.cardContainerCentered;
    }

    const cardTopIfBelow = spotlight.y + spotlight.height + SPOTLIGHT_PADDING + 16;
    const belowFits      = cardTopIfBelow + ESTIMATED_CARD_HEIGHT < SCREEN_HEIGHT - 20;

    if (belowFits) {
      return {
        ...StyleSheet.absoluteFillObject,
        justifyContent:    "flex-start",
        alignItems:        "center",
        paddingTop:        cardTopIfBelow,
        paddingHorizontal: 16,
      };
    }

    const cardBottomPadding = SCREEN_HEIGHT - spotlight.y + SPOTLIGHT_PADDING + 16;
    const cardTopIfAbove    = SCREEN_HEIGHT - cardBottomPadding - ESTIMATED_CARD_HEIGHT;
    const aboveFits         = cardTopIfAbove >= 50;

    if (aboveFits) {
      return {
        ...StyleSheet.absoluteFillObject,
        justifyContent:    "flex-end",
        alignItems:        "center",
        paddingBottom:     cardBottomPadding,
        paddingHorizontal: 16,
      };
    }

    // Neither fits cleanly — pin the card to the top of the screen,
    // floating above the spotlighted element.
    return {
      ...StyleSheet.absoluteFillObject,
      justifyContent:    "flex-start",
      alignItems:        "center",
      paddingTop:        50,
      paddingHorizontal: 16,
    };
  }

  // ── Overlay ───────────────────────────────────────────────────────────────────
  // Without spotlight: full-screen dim.
  // With spotlight: four dim panels around a transparent cutout + glowing ring.
  // All Views use pointerEvents="none" so scroll gestures pass through on Dashboard.
  function renderOverlay() {
    if (!spotlight) {
      return <View style={styles.fullScreenDim} pointerEvents="none" />;
    }

    const spotlightTop    = spotlight.y - SPOTLIGHT_PADDING;
    const spotlightLeft   = spotlight.x - SPOTLIGHT_PADDING;
    const spotlightRight  = spotlight.x + spotlight.width  + SPOTLIGHT_PADDING;
    const spotlightBottom = spotlight.y + spotlight.height + SPOTLIGHT_PADDING;
    const spotlightWidth  = spotlight.width  + SPOTLIGHT_PADDING * 2;
    const spotlightHeight = spotlight.height + SPOTLIGHT_PADDING * 2;

    return (
      <>
        <View pointerEvents="none" style={[styles.dimPanel, {
          top: 0, left: 0, right: 0,
          height: Math.max(0, spotlightTop),
        }]} />
        <View pointerEvents="none" style={[styles.dimPanel, {
          top: spotlightBottom, left: 0, right: 0, bottom: 0,
        }]} />
        <View pointerEvents="none" style={[styles.dimPanel, {
          top:    spotlightTop,
          left:   0,
          width:  Math.max(0, spotlightLeft),
          height: spotlightHeight,
        }]} />
        <View pointerEvents="none" style={[styles.dimPanel, {
          top:    spotlightTop,
          left:   spotlightRight,
          right:  0,
          height: spotlightHeight,
        }]} />
        <View pointerEvents="none" style={[styles.spotlightRing, {
          top:         spotlightTop,
          left:        spotlightLeft,
          width:       spotlightWidth,
          height:      spotlightHeight,
          borderColor: activeAccentColor,
          shadowColor: activeAccentColor,
        }]} />
      </>
    );
  }

  // ── Shared card content ───────────────────────────────────────────────────────
  function renderCardContent() {
    return (
      <View style={styles.card}>
        <View style={styles.dragHandle} />

        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <Text style={[styles.stepIcon, { color: activeAccentColor }]}>
          {currentStep.icon}
        </Text>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepBody}>{currentStep.body}</Text>

        <View style={styles.progressDots}>
          {STEPS.map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[
                styles.dot,
                dotIndex === currentStepIndex && { backgroundColor: activeAccentColor, width: 18 },
                dotIndex <  currentStepIndex  && { backgroundColor: activeAccentColor + "88" },
              ]}
            />
          ))}
        </View>

        <View style={styles.navigationRow}>
          {currentStepIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: activeAccentColor }]}
            onPress={goToNextStep}
          >
            <Text style={styles.nextText}>{isLastStep ? "Let's go" : "Next →"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderDraggableCard() {
    return (
      <Animated.View
        style={{ transform: cardDragPosition.getTranslateTransform() }}
        {...dragHandler.panHandlers}
      >
        {renderCardContent()}
      </Animated.View>
    );
  }

  if (!visible) return null;

  // ── Two rendering modes ───────────────────────────────────────────────────────
  //
  // MODAL — Shop and Profile steps. React Native's <Modal> sits at native-window
  // level, so the card is visible above whichever tab is active. The spotlight
  // overlay is rendered inside the Modal so it frames elements on that tab.
  //
  // INLINE ABSOLUTE VIEW — all Dashboard steps. A plain absoluteFill View means
  // the underlying ScrollView still receives scroll gestures (pointerEvents="none"
  // on all dim panels passes touches straight through).

  if (currentStep.navigateTo) {
    return (
      <Modal transparent animationType="none" visible>
        {renderOverlay()}
        <View style={getCardContainerStyle()} pointerEvents="box-none">
          {renderDraggableCard()}
        </View>
      </Modal>
    );
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {renderOverlay()}
      <View style={getCardContainerStyle()} pointerEvents="box-none">
        {renderDraggableCard()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },

  dimPanel: {
    position:        "absolute",
    backgroundColor: "rgba(0,0,0,0.75)",
  },

  spotlightRing: {
    position:      "absolute",
    borderWidth:   2,
    borderRadius:  14,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius:  14,
    elevation:     10,
  },

  cardContainerCentered: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    padding:        24,
  },

  card: {
    width:           Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: COLORS.surface,
    borderWidth:     1,
    borderColor:     COLORS.border,
    borderRadius:    16,
    padding:         28,
    gap:             14,
  },

  dragHandle: {
    alignSelf:       "center",
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom:    4,
  },

  skipButton: { alignSelf: "flex-end" },
  skipText:   { color: COLORS.textMuted, fontSize: 13 },

  stepIcon:  { fontSize: 32, textAlign: "center" },
  stepTitle: { color: COLORS.text,      fontSize: 20, fontFamily: FONTS.bold, textAlign: "center" },
  stepBody:  { color: COLORS.textMuted, fontSize: 14, lineHeight: 22,         textAlign: "center" },

  progressDots: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            6,
    marginTop:      4,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: COLORS.border,
  },

  navigationRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  backButton:    { padding: 10 },
  backText:      { color: COLORS.textMuted, fontSize: 14 },
  nextButton:    { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  nextText:      { color: COLORS.bg, fontFamily: FONTS.bold, fontSize: 14 },
});
