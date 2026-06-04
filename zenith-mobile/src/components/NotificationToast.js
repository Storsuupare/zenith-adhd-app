import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function NotificationToast({ notifications }) {
  const { accentColor } = useTheme() || {};
  const TYPE_COLORS = {
    success:  COLORS.green,
    error:    COLORS.red,
    info:     accentColor || COLORS.accent,
    loot:     "#fbbf24",
    level_up: "#a78bfa",
  };

  if (!notifications?.length) return null;
  return (
    <View style={styles.root} pointerEvents="none">
      {notifications.map(n => (
        <View key={n.id} style={[styles.toast, { borderLeftColor: TYPE_COLORS[n.type?.toLowerCase()] || COLORS.accent }]}>
          <Text style={styles.msg}>{n.message}</Text>
          {n.rarity && <Text style={[styles.rarity, { color: TYPE_COLORS.loot }]}>{n.rarity.toUpperCase()}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 999,
  },
  toast: {
    backgroundColor: "rgba(9,12,19,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
  },
  msg: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  rarity: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
