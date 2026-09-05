import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function MoreScreen({ navigation }) {
  const { achievementsUnseen } = useUser() || {};
  const { accentColor } = useTheme() || {};

  const rows = [
    { key: "Leaderboard", label: "Leaderboard",  icon: "podium-outline",   badge: false },
    { key: "Awards",      label: "Achievements",  icon: "trophy-outline",   badge: achievementsUnseen },
    { key: "History",     label: "History",       icon: "time-outline",     badge: false },
    { key: "Settings",    label: "Settings",      icon: "settings-outline", badge: false },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="More" />
      <View style={styles.list}>
        {rows.map(row => (
          <TouchableOpacity
            key={row.key}
            style={styles.row}
            onPress={() => navigation.navigate(row.key)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={row.badge ? `${row.label}, new items` : row.label}
          >
            <View style={styles.rowLeft}>
              <Ionicons name={row.icon} size={20} color={accentColor || COLORS.accent} />
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <View style={styles.rowRight}>
              {row.badge && <View style={[styles.dot, { backgroundColor: accentColor || COLORS.accent }]} />}
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    backgroundColor:   "rgba(15,20,32,0.85)",
    borderWidth:       1,
    borderColor:       COLORS.border,
    borderRadius:      12,
    paddingVertical:   16,
    paddingHorizontal: 16,
  },
  rowLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.semiBold },
  dot:      { width: 8, height: 8, borderRadius: 4 },
});
