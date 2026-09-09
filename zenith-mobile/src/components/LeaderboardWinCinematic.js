import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { CREDITS_ICON } from "../constants/currency";
import { shareViewAsImage } from "../utils/shareCard";

export default function LeaderboardWinCinematic({ credits, activeDays, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const { accentColor } = useTheme() || {};
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.8)).current;
  const shareRef = useRef(null);
  const color    = accentColor || COLORS.accent;

  const handleShare = () => shareViewAsImage(shareRef, "Share your win");

  useEffect(() => {
    if (credits == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Reduce Motion: drop the zoom, keep the fade. setValue rather than a
    // conditional initial value, because the OS read resolves after the ref exists.
    if (reduceMotion) scale.setValue(1);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ...(reduceMotion ? [] : [Animated.spring(scale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true })]),
    ]).start();
  }, [credits]);

  if (credits == null) return null;

  return (
    <Modal transparent animationType="none" visible={credits != null}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.card, { borderColor: color + "88", transform: [{ scale }] }]}>
          <View style={[styles.glow, { backgroundColor: color + "11" }]} />

          <View ref={shareRef} collapsable={false} style={styles.shareableContent}>
            <Text style={styles.eyebrow}>WEEKLY LEADERBOARD</Text>

            <Text style={[styles.rankLabel, { color }]}>#1</Text>

            <Text style={[styles.title, { color }]}>
              TOP OF YOUR CIRCLE
            </Text>

            <View style={styles.divider} />

            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Active Days</Text>
              <Text style={[styles.rewardValue, { color }]}>{activeDays}/7</Text>
            </View>
            <View style={[styles.rewardRow, { justifyContent: "flex-end" }]}>
              <Text style={[styles.rewardValue, { color }]}>+{credits} {CREDITS_ICON}</Text>
            </View>

            <Text style={styles.wordmark}>ZENITH</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.shareBtn, { borderColor: color }]} onPress={handleShare}>
              <Text style={[styles.shareText, { color }]}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dismissBtn, { borderColor: color }]} onPress={onDismiss}>
              <Text style={[styles.dismissText, { color }]}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
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
    gap: 12,
    overflow: "hidden",
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  // Everything captured for sharing — buttons live outside this in `actionRow`
  // so a shared image never includes "SHARE"/"CONTINUE" chrome.
  shareableContent: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  eyebrow: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 3, fontFamily: FONTS.bold },
  rankLabel: { fontSize: 56, fontFamily: FONTS.bold, letterSpacing: 4 },
  title: { fontSize: 16, fontFamily: FONTS.bold, letterSpacing: 3 },
  divider: { width: "60%", height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  rewardLabel: { color: COLORS.textMuted, fontSize: 13 },
  rewardValue: { fontSize: 13, fontFamily: FONTS.bold },
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
    marginTop: 8,
  },
  shareBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  shareText: { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 2 },
  dismissBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  dismissText: { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 2 },
});
