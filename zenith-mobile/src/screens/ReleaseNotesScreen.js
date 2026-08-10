import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { COLORS } from "../constants/colors";

const TAG_COLORS = {
  NEW:     COLORS.accent,
  FIX:     COLORS.green,
  CHANGE:  COLORS.gold,
  REMOVED: COLORS.red,
};

const CHANGELOG = [
  {
    version: "1.1.0",
    date:    "Coming Soon",
    title:   "Introducing iOS Widgets",
    entries: [
      { tag: "NEW",    text: "iOS Widgets — Countdown and Streak, right on your Home Screen or Lock Screen" },
      { tag: "NEW",    text: "Refund Policy page, with Restore Purchases built right in" },
      { tag: "NEW",    text: "Halfway check-in — a quick nudge at the midpoint of longer sessions, capped so it never gets spammy" },
      { tag: "CHANGE", text: "Onboarding now clearly walks through starting a session, the shop, and your skills" },
      { tag: "CHANGE", text: "Neural Clock guidance scrolls fully into view during onboarding" },
      { tag: "CHANGE", text: "Shop and Skills sections scroll smoothly to show everything" },
      { tag: "CHANGE", text: "Restore Purchases and your app version are always clearly visible in Settings" },
    ],
  },
  {
    version: "1.0.0",
    date:    "May 2026",
    title:   "Initial Release",
    entries: [
      { tag: "NEW", text: "Session-based XP and credit economy" },
      { tag: "NEW", text: "12 skills with prestige system" },
      { tag: "NEW", text: "Loot drop system with rarity tiers" },
      { tag: "NEW", text: "Neural Clock — time-based reward multipliers" },
      { tag: "NEW", text: "Daily challenge with credit reward" },
      { tag: "NEW", text: "Solar backdrop — live sky based on time of day" },
      { tag: "NEW", text: "Themes in the shop" },
      { tag: "NEW", text: "History — session history and skill XP breakdown" },
    ],
  },
];

export default function ReleaseNotesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Release Notes</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {CHANGELOG.map((entry, i) => (
          <View key={i} style={styles.block}>
            <View style={styles.versionRow}>
              <Text style={styles.version}>v{entry.version}</Text>
              <Text style={styles.date}>{entry.date}</Text>
            </View>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {entry.description && (
              <Text style={styles.description}>{entry.description}</Text>
            )}
            {entry.entries.map((e, j) => (
              <View key={j} style={styles.entryRow}>
                <Text style={[styles.tag, { color: TAG_COLORS[e.tag] || COLORS.textMuted }]}>
                  {e.tag}
                </Text>
                <Text style={styles.entryText}>{e.text}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "rgba(9,12,19,0.6)",
  },
  back:       { color: COLORS.accent, fontSize: 18 },
  pageTitle:  { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  content:    { padding: 16, gap: 20, paddingBottom: 32 },
  block: {
    backgroundColor: "rgba(15,20,32,0.85)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  versionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  version:    { color: COLORS.accent, fontSize: 14, fontWeight: "700" },
  date:       { color: COLORS.textMuted, fontSize: 12 },
  entryTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  entryRow:   { flexDirection: "row", gap: 8, alignItems: "center" },
  tag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    width: 68,
    textAlign: "center",
  },
  entryText:   { color: COLORS.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },
  description: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 4, fontStyle: "italic" },
});
