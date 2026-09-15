import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function MoreScreen({ navigation }) {
  const { achievementsUnseen, user } = useUser() || {};
  const { accentColor } = useTheme() || {};
  const isProPlus = (user?.account_tier ?? 0) >= 1;

  // Grouped rather than one flat list — six equal-weight rows in a row gives
  // nothing for the eye to filter by, and this app has already fixed the same
  // problem once before (the MissionForm skill picker) for the same reason.
  const groups = [
    {
      label: "SOCIAL",
      rows: [
        { key: "Leaderboard",   label: "Leaderboard",     icon: "podium-outline", badge: false },
        { key: "FocusTogether", label: "Focus Together",  icon: "pulse-outline",  badge: false },
      ],
    },
    {
      label: "PERSONAL PROGRESS",
      rows: [
        { key: "Awards",   label: "Achievements", icon: "trophy-outline",    badge: achievementsUnseen },
        { key: "Insights", label: "Insights",     icon: "analytics-outline", badge: false, proOnly: true },
        { key: "History",  label: "History",      icon: "time-outline",     badge: false },
      ],
    },
    {
      label: null,
      rows: [
        { key: "Settings", label: "Settings", icon: "settings-outline", badge: false },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="More" />
      <View style={styles.content}>
        {groups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.group}>
            {group.label && <Text style={styles.groupLabel}>{group.label}</Text>}
            <View style={styles.list}>
              {group.rows.map(row => (
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
                    {row.proOnly && !isProPlus && (
                      <View style={[styles.proTag, { borderColor: (accentColor || COLORS.accent) + "55" }]}>
                        <Text style={[styles.proTagText, { color: accentColor || COLORS.accent }]}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.rowRight}>
                    {row.badge && <View style={[styles.dot, { backgroundColor: accentColor || COLORS.accent }]} />}
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, gap: 20 },

  group:      { gap: 8 },
  groupLabel: {
    color:         "rgba(255,255,255,0.4)",
    fontSize:      11,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 2,
    paddingLeft:   4,
  },

  list: { gap: 10 },
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
  proTag: {
    borderWidth:       1,
    borderRadius:      4,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  proTagText: {
    fontSize:      9,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 0.5,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.semiBold },
  dot:      { width: 8, height: 8, borderRadius: 4 },
});
