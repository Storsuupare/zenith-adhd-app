import React from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";

const TAG_COLORS = {
  NEW:     COLORS.accent,
  FIX:     COLORS.green,
  CHANGE:  COLORS.gold,
  REMOVED: COLORS.red,
};

const CHANGELOG = [
  {
    version: "1.3.0",
    title:   "Focus Together & Insights",
    entries: [
      { tag: "NEW",    text: "Focus Together — see when a friend is currently focusing; PRO+ adds which skill and how long they've been at it" },
      { tag: "NEW",    text: "Insights (PRO+) — your best focus hour, top skill this month, and a 90-day activity heatmap" },
      { tag: "NEW",    text: "ELITE gets a full ranked breakdown of every skill you've focused on this month in Insights, not just your top one" },
      { tag: "NEW",    text: "Focus-time milestones — earn Credits and guaranteed loot at 15, 50, and 100 lifetime hours focused, with your progress visible in Insights" },
      { tag: "NEW",    text: "Add friends with a shareable invite code instead of having to know their exact username" },
      { tag: "FIX",    text: "Fixed pausing a session leaving you showing as still focusing to friends" },
      { tag: "FIX",    text: "Fixed Insights' best hour using server time instead of your own" },
      { tag: "FIX",    text: "Fixed the Live Activity freezing on a stale icon once a session's timer hit zero — it now shows a real progress bar and a clear \"Session Completed!\" state" },
      { tag: "FIX",    text: "Fixed the launch screen showing a placeholder icon instead of the actual Zenith logo" },
      { tag: "CHANGE", text: "Loot drop celebrations — consistent rarity colors matching Achievements, a sound for every rarity, and flying coin particles" },
      { tag: "CHANGE", text: "History trimmed down to remove stats now covered by Insights" },
      { tag: "CHANGE", text: "Reorganized the More screen into clearer sections" },
      { tag: "CHANGE", text: "Adjusted how fast your overall Rank climbs relative to your individual skill levels, so it stays more in line with them" },
    ],
  },
  {
    version: "1.2.0",
    title:   "Leaderboard, Pause, and Fixes",
    entries: [
      { tag: "NEW",    text: "Weekly Leaderboard — compete with friends, family, or partners for the most active days this week and earn Credits for topping your circle" },
      { tag: "NEW",    text: "Pause a session mid-way and pick up right where you left off, within a time limit based on your tier" },
      { tag: "NEW",    text: "Get notified the moment a session finishes, so you never miss collecting your reward" },
      { tag: "NEW",    text: "The Streak widget can now be added to your Lock Screen, not just your Home Screen" },
      { tag: "NEW",    text: "Skill icons now match what they actually represent, instead of abstract shapes you had to memorize" },
      { tag: "NEW",    text: "4 new achievements for topping your friend circle's weekly leaderboard" },
      { tag: "FIX",    text: "Fixed themes sometimes carrying over when switching accounts on a shared device" },
      { tag: "FIX",    text: "Fixed onboarding sometimes rendering incorrectly on first launch" },
      { tag: "FIX",    text: "Fixed an issue where overlapping sessions could award extra credit" },
      { tag: "FIX",    text: "Fixed accepting a mutual friend request creating a duplicate entry" },
      { tag: "FIX",    text: "Fixed starting a session requiring you to remember which category your skill was hidden under to select it" },
      { tag: "FIX",    text: "Fixed the Save as Template button showing for Free tier, which can't use templates, and being hard to read for everyone else" },
      { tag: "FIX",    text: "Fixed Streak Rescue showing the wrong price in the shop" },
      { tag: "CHANGE", text: "New app icon and logo! The old one had an extremely similar design as Google Gemini! Same design but different colors!" },
      { tag: "CHANGE", text: "Achievement medals now use proper icons instead of a star rating" },
      { tag: "REMOVED", text: "Removed Extra Loot Pull from the shop — it was a disguised gamble, not a fair deal" },
      { tag: "CHANGE", text: "Updated our Privacy Policy to cover what friends can see about you on the Weekly Leaderboard" },
    ],
  },
  {
    version: "1.1.0",
    title:   "Prestige, Rebuilt",
    entries: [
      { tag: "NEW",    text: "Prestige is now available on every tier — resetting a maxed skill also unlocks permanent Red Zone immunity for it, no subscription required" },
      { tag: "NEW",    text: "Share your Prestige moments straight from the celebration screen" },
      { tag: "NEW",    text: "Last 7 Days — a quick strip on the Dashboard showing which days you completed a session" },
      { tag: "FIX",    text: "Fixed session-complete UI pipeline to feel way smoother!" },
      { tag: "FIX",    text: "Fixed streak counting being inaccurate for some timezones." },
      { tag: "FIX",    text: "The Loot Drop UI has been improved for smoother visibility and accessibility." },
      { tag: "CHANGE", text: "Refreshed overall rank names!" },
      { tag: "CHANGE", text: "The skill Execution got renamed to Momentum." },
    ],
  },
  {
    version: "1.0.0",
    title:   "Initial Release",
    entries: [
      { tag: "NEW", text: "Session-based XP and credit economy" },
      { tag: "NEW", text: "12 skills with prestige system" },
      { tag: "NEW", text: "Loot drop system with rarity tiers" },
      { tag: "NEW", text: "Achievements — 26 to unlock across sessions, streaks, skills and collection" },
      { tag: "NEW", text: "iOS Widgets — Countdown and Streak, on your Home Screen or Lock Screen" },
      { tag: "NEW", text: "Neural Clock — time-based reward multipliers" },
      { tag: "NEW", text: "Daily challenge with credit reward" },
      { tag: "NEW", text: "Solar backdrop — live sky based on time of day" },
      { tag: "NEW", text: "Themes and consumables in the shop" },
      { tag: "NEW", text: "History — session history and skill XP breakdown" },
      { tag: "NEW", text: "Halfway check-in — a quick nudge at the midpoint of longer sessions, capped so it never gets spammy" },
      { tag: "NEW", text: "Reduce Motion support for anyone who prefers less animation" },
    ],
  },
];

export default function ReleaseNotesScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Release Notes" onBack={() => navigation.goBack()} />

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
