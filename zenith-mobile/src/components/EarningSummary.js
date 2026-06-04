import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function EarningSummary({ data, onDismiss }) {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const color   = data?.skillName
    ? (SKILL_COLORS[data.skillName.toUpperCase()] || ac)
    : ac;

  useEffect(() => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [data]);

  if (!data) return null;

  return (
    <Modal transparent animationType="none" visible={!!data}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <Animated.View style={[styles.card, { borderColor: color + "66", transform: [{ scale }], opacity }]}>

          {data.skillName && (
            <Text style={[styles.skillLabel, { color }]}>{data.skillName.toUpperCase()}</Text>
          )}

          <Text style={[styles.xpHero, { color }]}>+{data.xpGained}</Text>
          <Text style={styles.xpUnit}>XP EARNED</Text>

          {data.levelUp && (
            <View style={[styles.levelUpBanner, { borderColor: color }]}>
              <Text style={[styles.levelUpText, { color }]}>
                LEVEL {data.levelUp.level} · {data.levelUp.rank}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {data.creditsEarned > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Credits</Text>
              <Text style={styles.rowValue}>+{data.creditsEarned} CR</Text>
            </View>
          )}
          {data.duration > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Duration</Text>
              <Text style={styles.rowValue}>{data.duration} min</Text>
            </View>
          )}
          {data.streak > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Streak</Text>
              <Text style={[styles.rowValue, { color: "#f97316" }]}>{data.streak} days</Text>
            </View>
          )}
          {data.perkActive && data.xpMultiplier > 1 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Multiplier</Text>
              <Text style={[styles.rowValue, { color: COLORS.gold }]}>{data.xpMultiplier}×</Text>
            </View>
          )}

          <Text style={styles.hint}>tap to dismiss</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  skillLabel: { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 2 },
  xpHero:    { fontSize: 64, fontFamily: FONTS.bold, lineHeight: 72 },
  xpUnit:    { color: COLORS.textMuted, fontSize: 12, letterSpacing: 2, marginTop: -4 },
  levelUpBanner: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  levelUpText: { fontSize: 12, fontFamily: FONTS.bold, letterSpacing: 1 },
  divider: { width: "100%", height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  rowLabel: { color: COLORS.textMuted, fontSize: 13 },
  rowValue: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold },
  hint: { color: COLORS.textMuted, fontSize: 11, marginTop: 8 },
});
