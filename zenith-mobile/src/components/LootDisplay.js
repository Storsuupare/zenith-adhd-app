import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { CREDITS_ICON } from "../constants/currency";
import { shareViewAsImage } from "../utils/shareCard";
import SparkBurst from "./SparkBurst";

// One file per rarity, so a real distinct sound can replace any single file
// later with zero code changes — right now they're all the same placeholder
// (the notification bell tone), just to prove the playback pipeline works
// end to end. When real sounds get sourced, aim for the same escalation as
// everything else here: something plain/quiet for Junk, something genuinely
// rich for Mythic.
const LOOT_SOUND_SOURCE = {
  junk:      require("../../assets/loot-sounds/junk.wav"),
  uncommon:  require("../../assets/loot-sounds/uncommon.wav"),
  rare:      require("../../assets/loot-sounds/rare.wav"),
  epic:      require("../../assets/loot-sounds/epic.wav"),
  legendary: require("../../assets/loot-sounds/legendary.wav"),
  mythic:    require("../../assets/loot-sounds/mythic.wav"),
};

// Matches RARITY_COLORS in AchievementsScreen.js — same rarity, same color,
// everywhere in the app. The ladder escalates in one direction (green → blue
// → purple → gold → pink) rather than zigzagging, so Mythic reads as its own
// distinct peak instead of a slightly-different Epic.
const RARITY_COLORS = {
  mythic:    "#f472b6",
  legendary: "#fbbf24",
  epic:      "#a855f7",
  rare:      "#60a5fa",
  uncommon:  "#4ade80",
  common:    "rgba(255,255,255,0.55)",
  junk:      "rgba(120,120,120,0.6)",
};

const RARITY_LABELS = {
  mythic:    "MYTHIC DROP",
  legendary: "LEGENDARY DROP",
  epic:      "EPIC DROP",
  rare:      "RARE DROP",
  uncommon:  "UNCOMMON DROP",
  common:    "COMMON DROP",
  junk:      "JUNK DROP",
};

// A distinct shape per rarity, not just a color — the rarity signal shouldn't
// live in hue alone, since that leaves colorblind players with no way to tell
// Rare from Legendary from Mythic.
const RARITY_ICONS = {
  mythic:    "✺",
  legendary: "★",
  epic:      "✦",
  rare:      "◆",
  uncommon:  "●",
  common:    "○",
  junk:      "▫",
};

const CREDITS_COLOR = "#fbbf24";

// Epic/Legendary/Mythic each get a bigger celebration than the last, not the
// identical treatment — Mythic is supposed to be the single best outcome the
// loot system can produce, so it needs to read as more than "Epic in a
// different color". hapticPulses is how many extra Heavy impacts follow the
// initial Success notification (0 for Epic, escalating from there).
// Rare gets a glow only (sparkCount 0) — a genuine step up from Junk/Common/
// Uncommon, but not the full burst treatment, or it would blur into Epic and
// undercut the escalation those three tiers are actually meant to signal.
const CELEBRATION_BY_RARITY = {
  rare:      { sparkCount: 0,  sparkDistance: 0,   glowAlpha: "10", burstDuration: 0,   hapticPulses: 0 },
  epic:      { sparkCount: 6,  sparkDistance: 60,  glowAlpha: "18", burstDuration: 650, hapticPulses: 0 },
  legendary: { sparkCount: 10, sparkDistance: 80,  glowAlpha: "24", burstDuration: 750, hapticPulses: 1 },
  mythic:    { sparkCount: 14, sparkDistance: 100, glowAlpha: "30", burstDuration: 900, hapticPulses: 2 },
};

export default function LootDisplay({ loot, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const scale  = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shareRef = useRef(null);

  // One player per rarity — useAudioPlayer is a hook, so these all have to be
  // called unconditionally every render (same rule as any other hook), not
  // just for whichever rarity actually dropped this time.
  const junkSound      = useAudioPlayer(LOOT_SOUND_SOURCE.junk);
  const uncommonSound  = useAudioPlayer(LOOT_SOUND_SOURCE.uncommon);
  const rareSound      = useAudioPlayer(LOOT_SOUND_SOURCE.rare);
  const epicSound      = useAudioPlayer(LOOT_SOUND_SOURCE.epic);
  const legendarySound = useAudioPlayer(LOOT_SOUND_SOURCE.legendary);
  const mythicSound    = useAudioPlayer(LOOT_SOUND_SOURCE.mythic);
  const soundByRarity = {
    junk: junkSound, uncommon: uncommonSound, rare: rareSound,
    epic: epicSound, legendary: legendarySound, mythic: mythicSound,
  };

  const rarityKey    = loot?.rarity?.toLowerCase() || "common";
  const rarityColor  = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;
  const rarityIcon   = RARITY_ICONS[rarityKey] || RARITY_ICONS.common;
  const celebration  = CELEBRATION_BY_RARITY[rarityKey] || null;
  // Epic/Legendary/Mythic only — sharing every routine drop would make the
  // gesture meaningless, same reasoning as why those three get the bigger
  // celebration in the first place.
  const isShareable  = celebration && celebration.sparkCount > 0;

  const handleShare = () => shareViewAsImage(shareRef, "Share your drop");

  useEffect(() => {
    if (!loot) return;

    const sound = soundByRarity[rarityKey];
    if (sound) {
      sound.seekTo(0).catch(() => {});
      sound.play();
    }

    if (celebration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      for (let pulse = 0; pulse < celebration.hapticPulses; pulse++) {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300 + pulse * 250);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Reduce Motion: the reveal keeps its fade but loses the zoom.
    if (reduceMotion) scale.setValue(1);

    Animated.parallel([
      ...(reduceMotion ? [] : [Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 })]),
      Animated.timing(opacity, { toValue: 1,   useNativeDriver: true, duration: 250 }),
    ]).start();
  }, [loot]);

  if (!loot) return null;

  return (
    <Modal transparent animationType="none" visible={!!loot}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity, borderColor: rarityColor }]}>

          <View ref={shareRef} collapsable={false} style={styles.shareableContent}>
            {celebration && <View style={[styles.glow, { backgroundColor: rarityColor + celebration.glowAlpha }]} />}
            {celebration && celebration.sparkCount > 0 && !reduceMotion && (
              <SparkBurst color={rarityColor} celebration={celebration} glyph={CREDITS_ICON} />
            )}

            <Text style={styles.eyebrow}>DROP RECEIVED</Text>

            <Text style={[styles.rarityIcon, { color: rarityColor }]}>{rarityIcon}</Text>

            <Text style={[styles.rarityLabel, { color: rarityColor }]}>
              {RARITY_LABELS[rarityKey]}
            </Text>

            <Text style={styles.credits} accessibilityLabel={`${loot.credits_earned} Credits`}>
              {CREDITS_ICON} +{loot.credits_earned}
            </Text>

            {isShareable && <Text style={styles.wordmark}>ZENITH</Text>}
          </View>

          <View style={styles.actionRow}>
            {isShareable && (
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: rarityColor }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share this drop"
              >
                <Text style={[styles.shareText, { color: rarityColor }]}>SHARE</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.collectBtn, { borderColor: rarityColor }]}
              onPress={onDismiss}
            >
              <Text style={[styles.collectText, { color: rarityColor }]}>COLLECT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(9,12,19,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 20,
    overflow: "hidden",
  },
  // Everything captured for sharing — buttons live outside this in `actionRow`
  // so a shared image never includes "COLLECT"/"SHARE" chrome.
  shareableContent: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  wordmark: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 4,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: FONTS.bold,
  },
  rarityIcon: {
    fontSize: 28,
    lineHeight: 32,
  },
  rarityLabel: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
  credits: {
    color: CREDITS_COLOR,
    fontSize: 26,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  collectBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  collectText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
  shareBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  shareText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
});
