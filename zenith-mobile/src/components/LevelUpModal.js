import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { CREDITS_ICON } from "../constants/currency";
import { shareViewAsImage } from "../utils/shareCard";

const TIER_LABELS = { 0: null, 1: "1.5× XP BOOST ACTIVE", 2: "2× SURGE ACTIVE" };

const SCENARIO = {
  skill99: {
    eyebrow:    "PRESTIGE READY",
    heading:    "LEVEL 99",
    subheading: "SKILL MASTERED",
    color:      "#ff0040",
    dimColor:   "rgba(255,0,64,0.15)",
    borderAlpha: "55",
    autoDismiss: 5000,
  },
  totalLevelUp: {
    eyebrow:    "SYSTEM EVENT",
    heading:    null,
    subheading: "LEVEL UP",
    color:      null,
    dimColor:   null,
    borderAlpha: "88",
    autoDismiss: 3500,
  },
  skillLevelUp: {
    eyebrow:    "SKILL ADVANCED",
    heading:    null,
    subheading: "LEVEL UP",
    color:      null,
    dimColor:   null,
    borderAlpha: "55",
    autoDismiss: 3000,
  },
  milestone: {
    eyebrow:    "STREAK MILESTONE",
    heading:    null,
    subheading: "DAY STREAK",
    color:      "#f59e0b",
    dimColor:   "rgba(245,158,11,0.08)",
    borderAlpha: "66",
    autoDismiss: 5000,
  },
};

export default function LevelUpModal({ data, onDismiss }) {
  const { accentColor } = useTheme() || {};
  const themeAccent = accentColor || COLORS.accent;
  const reduceMotion = useReducedMotion();

  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shareRef = useRef(null);

  const scenario = SCENARIO[data?.type] || SCENARIO.totalLevelUp;
  const accentOverride = scenario.color || themeAccent;
  const dimBg = scenario.dimColor || (themeAccent + "11");
  // Hitting level 99, or any streak milestone. "milestone" only ever fires for
  // the five real STREAK_MILESTONES entries (7/14/30/60/100 days) — the app
  // already decided those are significant, so there's no need to gate on top
  // of that. Unlike level-ups, which happen constantly and would make sharing
  // meaningless if included.
  const isShareable = data && (data.type === "skill99" || data.type === "milestone");

  const handleShare = () => shareViewAsImage(shareRef, "Share your achievement");

  useEffect(() => {
    if (!data) return;

    if (data.type === "skill99") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
    } else if (data.type === "totalLevelUp") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (data.type === "milestone" || (data.type === "skillLevelUp" && data.skillMilestoneCredits > 0)) {
      // A skill-level milestone (every 10 levels) is rarer than a routine level-up,
      // so it earns the same heavier feedback as a streak milestone instead of the
      // plain single tap a regular level-up gets.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Under Reduce Motion the spring is the part that has to go — it's a zoom
    // with bounce, which is exactly the motion that triggers vestibular symptoms.
    // The fade stays: Apple's guidance is to replace movement with a cross-fade
    // rather than remove animation entirely, because things appearing instantly
    // makes it unclear what just happened.
    if (reduceMotion) {
      scale.setValue(1);
      Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 300 }).start();
    } else {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 300 }),
      ]).start();
    }

    // A skill-level milestone has an extra badge to read — give it a bit more
    // time on screen than a routine level-up gets.
    const hasMilestoneBadge = data.type === "skillLevelUp" && data.skillMilestoneCredits > 0;
    const timer = setTimeout(onDismiss, hasMilestoneBadge ? scenario.autoDismiss + 2000 : scenario.autoDismiss);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;

  const tierLabel = TIER_LABELS[data.tier] || null;

  return (
    <Modal transparent animationType="none" visible={!!data}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: dimBg, borderColor: accentOverride + scenario.borderAlpha },
          { transform: [{ scale }], opacity },
        ]}>
          <View ref={shareRef} collapsable={false} style={styles.shareableContent}>
            <Text style={[styles.eyebrow, { color: accentOverride }]}>{scenario.eyebrow}</Text>

            <Text style={[styles.levelNumber, { color: accentOverride }]}>
              {data.type === "milestone" ? data.days : (scenario.heading || data.level)}
            </Text>

            <Text style={styles.levelLabel}>{scenario.subheading}</Text>

            {data.type !== "milestone" && data.skillName && (
              <Text style={[styles.skillName, { color: accentOverride + "cc" }]}>
                {data.skillName.toUpperCase()}
              </Text>
            )}

            {data.type !== "milestone" && data.xpGain > 0 && (
              <Text style={styles.xpGain}>+{data.xpGain} XP</Text>
            )}

            {data.type === "milestone" && data.credits_earned > 0 && (
              <View
                style={[styles.badge, { backgroundColor: accentOverride + "22", borderColor: accentOverride + "55" }]}
                accessible
                accessibilityLabel={`${data.credits_earned} Credits milestone reward`}
              >
                <Text style={[styles.badgeText, { color: accentOverride }]}>{CREDITS_ICON} +{data.credits_earned} MILESTONE REWARD</Text>
              </View>
            )}

            {data.type === "milestone" && data.loot && (
              <View
                style={[styles.badge, { backgroundColor: accentOverride + "15", borderColor: accentOverride + "44" }]}
                accessible
                accessibilityLabel={`Guaranteed ${data.loot.rarity} drop, ${data.loot.credits_earned} Credits`}
              >
                <Text style={[styles.badgeText, { color: accentOverride }]}>
                  GUARANTEED {data.loot.rarity.toUpperCase()} DROP  {CREDITS_ICON} +{data.loot.credits_earned}
                </Text>
              </View>
            )}

            {data.type === "milestone" && data.shield_unlocked && (
              <View style={[styles.badge, { backgroundColor: "#3b82f622", borderColor: "#3b82f655" }]}>
                <Text style={[styles.badgeText, { color: "#3b82f6" }]}>STREAK SHIELD UNLOCKED</Text>
              </View>
            )}

            {data.type === "skillLevelUp" && data.skillMilestoneCredits > 0 && (
              <View
                style={[styles.badge, { backgroundColor: accentOverride + "22", borderColor: accentOverride + "55" }]}
                accessible
                accessibilityLabel={`${data.skillMilestoneCredits} Credits, level milestone`}
              >
                <Text style={[styles.badgeText, { color: accentOverride }]}>{CREDITS_ICON} +{data.skillMilestoneCredits} — LEVEL MILESTONE</Text>
              </View>
            )}

            {data.type === "skill99" && (
              <View style={[styles.badge, { backgroundColor: accentOverride + "22", borderColor: accentOverride + "55" }]}>
                <Text style={[styles.badgeText, { color: accentOverride }]}>PRESTIGE THIS SKILL TO RESET AND EARN A BADGE</Text>
              </View>
            )}

            {tierLabel && (
              <View style={[styles.badge, { backgroundColor: themeAccent + "22", borderColor: themeAccent + "55" }]}>
                <Text style={[styles.badgeText, { color: themeAccent }]}>{tierLabel}</Text>
              </View>
            )}

            {isShareable && <Text style={styles.wordmark}>ZENITH</Text>}
          </View>

          {isShareable && (
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: accentOverride }]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share this achievement"
            >
              <Text style={[styles.shareText, { color: accentOverride }]}>SHARE</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>tap to dismiss</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: "rgba(9,12,19,0.9)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         32,
  },
  card: {
    width:           "100%",
    maxWidth:        320,
    backgroundColor: COLORS.surface,
    borderWidth:     1,
    borderRadius:    16,
    padding:         32,
    alignItems:      "center",
    gap:             10,
  },
  // Everything captured for sharing — the Share button and "tap to dismiss"
  // hint live outside this, so a shared image never includes UI chrome.
  shareableContent: {
    alignItems: "center",
    gap:        10,
  },
  wordmark: {
    color:         "rgba(255,255,255,0.25)",
    fontSize:      10,
    fontFamily:    FONTS.bold,
    letterSpacing: 4,
    marginTop:     4,
  },
  shareBtn: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 24,
    paddingVertical:   10,
  },
  shareText: {
    fontSize:      13,
    fontFamily:    FONTS.bold,
    letterSpacing: 2,
  },
  eyebrow: {
    fontSize:      11,
    letterSpacing: 3,
    fontFamily:    FONTS.bold,
  },
  levelNumber: {
    fontSize:   72,
    fontFamily: FONTS.bold,
    lineHeight: 80,
  },
  levelLabel: {
    color:         COLORS.text,
    fontSize:      18,
    fontFamily:    FONTS.bold,
    letterSpacing: 4,
  },
  skillName: {
    fontSize:      13,
    letterSpacing: 2,
    fontFamily:    FONTS.monoBold,
  },
  xpGain: {
    color:      COLORS.green,
    fontSize:   16,
    fontFamily: FONTS.semiBold,
  },
  badge: {
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 12,
    paddingVertical:   6,
    marginTop:         4,
  },
  badgeText: {
    fontSize:      11,
    fontFamily:    FONTS.bold,
    letterSpacing: 1,
    textAlign:     "center",
  },
  hint: {
    color:     COLORS.textMuted,
    fontSize:  11,
    marginTop: 8,
  },
});
