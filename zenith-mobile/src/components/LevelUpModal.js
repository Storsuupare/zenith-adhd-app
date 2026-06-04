import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

const TIER_LABELS = { 0: null, 1: "1.5× XP BOOST ACTIVE", 2: "2× SURGE ACTIVE" };

export default function LevelUpModal({ data, onDismiss }) {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, useNativeDriver: true, duration: 300 }),
    ]).start();
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;

  const tierLabel = TIER_LABELS[data.tier] || null;

  return (
    <Modal transparent animationType="none" visible={!!data}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <Animated.View style={[styles.card, { borderColor: ac + "88", transform: [{ scale }], opacity }]}>
          <Text style={styles.eyebrow}>SYSTEM EVENT</Text>

          <Text style={[styles.levelNumber, { color: ac }]}>{data.level}</Text>
          <Text style={styles.levelLabel}>LEVEL UP</Text>

          {data.skillName && (
            <Text style={styles.skillName}>{data.skillName.toUpperCase()}</Text>
          )}

          {data.xpGain > 0 && (
            <Text style={styles.xpGain}>+{data.xpGain} XP</Text>
          )}

          {tierLabel && (
            <View style={[styles.boostBadge, { backgroundColor: ac + "22", borderColor: ac + "55" }]}>
              <Text style={[styles.boostText, { color: ac }]}>{tierLabel}</Text>
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
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent + "88",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: FONTS.bold,
  },
  levelNumber: {
    color: COLORS.accent,
    fontSize: 72,
    fontFamily: FONTS.bold,
    lineHeight: 80,
  },
  levelLabel: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: FONTS.bold,
    letterSpacing: 4,
  },
  skillName: {
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 2,
  },
  xpGain: {
    color: COLORS.green,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  boostBadge: {
    backgroundColor: COLORS.accent + "22",
    borderWidth: 1,
    borderColor: COLORS.accent + "55",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  boostText: {
    color: COLORS.accent,
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 1,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
});
