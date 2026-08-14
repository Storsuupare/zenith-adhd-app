import React, { useEffect, useRef } from "react";
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

const RARITY_COLORS = {
  mythic:    "#a335ee",
  legendary: "#ffae00",
  epic:      "#8b5cf6",
  rare:      "#22d3ee",
  uncommon:  "#1eff00",
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

export default function LootDisplay({ loot, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const scale  = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const rarityKey   = loot?.rarity?.toLowerCase() || "common";
  const rarityColor = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;
  const isHighRarity = ["mythic", "legendary", "epic"].includes(rarityKey);

  useEffect(() => {
    if (!loot) return;
    if (isHighRarity) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <Animated.View
          style={[styles.rarityWash, { backgroundColor: rarityColor, opacity: Animated.multiply(opacity, isHighRarity ? 0.12 : 0.05) }]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity, borderColor: rarityColor }]}>

          {isHighRarity && <View style={[styles.glow, { backgroundColor: rarityColor + "22" }]} />}

          <Text style={styles.eyebrow}>DROP RECEIVED</Text>

          <Text style={[styles.rarityLabel, { color: rarityColor }]}>
            {RARITY_LABELS[rarityKey]}
          </Text>

          <Text style={[styles.credits, { color: rarityColor }]}>
            +{loot.credits_earned} Credits
          </Text>

          <TouchableOpacity
            style={[styles.collectBtn, { borderColor: rarityColor }]}
            onPress={onDismiss}
          >
            <Text style={[styles.collectText, { color: rarityColor }]}>COLLECT</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(9,12,19,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  rarityWash: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
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
  rarityLabel: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
  credits: {
    fontSize: 42,
    fontFamily: FONTS.bold,
  },
  collectBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 8,
  },
  collectText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 2,
  },
});
