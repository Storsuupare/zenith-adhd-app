import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView, RefreshControl,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import { fetchInsights } from "../services/api";

function formatHour(hour) {
  if (hour === null || hour === undefined) return "—";
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

// Chunks the 90-day array into 7-day columns (oldest-first), so the grid
// reads as consecutive weeks ending today — not aligned to calendar Sundays,
// which would need extra day-of-week bookkeeping this doesn't need to earn.
function chunkIntoWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function cellOpacity(minutes) {
  if (minutes <= 0) return 0.15;
  return Math.min(1, 0.35 + minutes / 120);
}

// ELITE-only — the full ranked breakdown behind the PRO-visible "TOP SKILL"
// tile. Bar width is percent-of-total (not percent-of-max), so two bars'
// lengths are directly comparable as "share of this month's focus time."
function SkillBreakdown({ rows, accentColor }) {
  return (
    <View style={styles.breakdownList}>
      {rows.map((row) => (
        <View key={row.name} style={styles.breakdownRow}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownName} numberOfLines={1}>{row.name}</Text>
            <Text style={[styles.breakdownPercent, { color: accentColor }]}>{row.percent}%</Text>
          </View>
          <View style={styles.breakdownTrack}>
            <View style={[styles.breakdownFill, { backgroundColor: accentColor, width: `${row.percent}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function HeatmapGrid({ heatmap, accentColor }) {
  const weeks = chunkIntoWeeks(heatmap);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.heatmapRow}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.heatmapColumn}>
            {week.map((day, dayIndex) => (
              <View
                key={dayIndex}
                style={[styles.heatmapCell, { backgroundColor: accentColor, opacity: cellOpacity(day.focus_minutes) }]}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function InsightsScreen({ navigation }) {
  const { user } = useUser() || {};
  const { accentColor } = useTheme() || {};
  const activeAccentColor = accentColor || COLORS.accent;
  const isProPlus = (user?.account_tier ?? 0) >= 1;
  const isElite   = (user?.account_tier ?? 0) >= 2;

  const [insights,   setInsights]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError,  setLoadError]  = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetchInsights();
      setInsights(response.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isProPlus) { setLoading(false); return; }
    load();
  }, [isProPlus, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!isProPlus) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Insights" onBack={() => navigation.goBack()} />
        <View style={styles.upgradeState}>
          <Text style={styles.upgradeTitle}>Insights is a PRO+ feature</Text>
          <Text style={styles.upgradeDetail}>
            See your best focus hour, your top skill this month, and a 90-day activity heatmap.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { borderColor: activeAccentColor }]}
            onPress={() => navigation.navigate("Settings")}
            accessibilityRole="button"
            accessibilityLabel="Upgrade"
          >
            <Text style={[styles.upgradeButtonText, { color: activeAccentColor }]}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Insights" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={activeAccentColor} style={styles.spinner} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Insights" onBack={() => navigation.goBack()} />
        <View style={styles.upgradeState}>
          <Text style={styles.upgradeTitle}>Couldn't load Insights</Text>
          <Text style={styles.upgradeDetail}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[styles.upgradeButton, { borderColor: activeAccentColor + "55" }]}
            onPress={() => { setLoading(true); load(); }}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={[styles.upgradeButtonText, { color: activeAccentColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Insights" subtitle="Last 90 days" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeAccentColor} />}
      >
        <View style={styles.tileRow}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>BEST HOUR</Text>
            <Text style={[styles.tileValue, { color: activeAccentColor }]}>
              {formatHour(insights?.best_hour)}
            </Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>TOP SKILL</Text>
            <Text style={[styles.tileValue, { color: activeAccentColor }]} numberOfLines={1}>
              {insights?.top_skill_this_month ?? "—"}
            </Text>
          </View>
        </View>

        {isElite ? (
          insights?.skill_breakdown?.length > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.tileLabel}>SKILL BREAKDOWN</Text>
              <SkillBreakdown rows={insights.skill_breakdown} accentColor={activeAccentColor} />
            </View>
          )
        ) : (
          <View style={[styles.eliteTease, { borderColor: activeAccentColor + "33" }]}>
            <Text style={styles.eliteTeaseText}>
              See a full ranked breakdown of every skill you've focused on this month
            </Text>
            <View style={[styles.eliteTag, { borderColor: activeAccentColor + "55" }]}>
              <Text style={[styles.eliteTagText, { color: activeAccentColor }]}>ELITE</Text>
            </View>
          </View>
        )}

        <View style={styles.heatmapSection}>
          <Text style={[styles.activeDaysValue, { color: activeAccentColor }]}>
            {(insights?.heatmap ?? []).filter(day => day.focus_minutes > 0).length}
          </Text>
          <Text style={styles.activeDaysLabel}>Days active!</Text>
          <HeatmapGrid heatmap={insights?.heatmap ?? []} accentColor={activeAccentColor} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: SPACING.screenPadding, paddingBottom: 40, gap: 20 },
  spinner: { marginTop: 40 },

  tileRow: { flexDirection: "row", gap: 12 },
  tile: {
    flex:             1,
    backgroundColor:  SURFACE.card,
    borderWidth:      1,
    borderColor:      SURFACE.cardBorder,
    borderRadius:     RADIUS.medium,
    padding:          14,
    gap:              6,
  },
  tileLabel: {
    color:         "rgba(255,255,255,0.4)",
    fontSize:      10,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 1,
  },
  tileValue: { fontSize: 18, fontFamily: FONTS.bold },

  breakdownSection: { gap: 10 },
  breakdownList:    { gap: 12 },
  breakdownRow:     { gap: 6 },
  breakdownHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownName:    { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold, flexShrink: 1 },
  breakdownPercent: { fontSize: 13, fontFamily: FONTS.bold },
  breakdownTrack: {
    height:           6,
    borderRadius:     3,
    backgroundColor:  "rgba(255,255,255,0.08)",
    overflow:         "hidden",
  },
  breakdownFill: { height: "100%", borderRadius: 3 },

  eliteTease: {
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
    gap:              12,
    backgroundColor:  SURFACE.card,
    borderWidth:      1,
    borderRadius:     RADIUS.medium,
    padding:          14,
  },
  eliteTeaseText: { flex: 1, color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, lineHeight: 17 },
  eliteTag: { borderWidth: 1, borderRadius: RADIUS.small, paddingHorizontal: 8, paddingVertical: 3 },
  eliteTagText: { fontSize: 10, fontFamily: FONTS.monoBold, letterSpacing: 1 },

  heatmapSection:  { alignItems: "center", gap: 4 },
  activeDaysValue: { fontSize: 40, fontFamily: FONTS.bold },
  activeDaysLabel: {
    color:      "rgba(255,255,255,0.4)",
    fontSize:   12,
    fontFamily: FONTS.regular,
    marginBottom: 14,
  },
  heatmapRow:    { flexDirection: "row", gap: 4 },
  heatmapColumn: { gap: 4 },
  heatmapCell:   { width: 16, height: 16, borderRadius: 4 },

  upgradeState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  upgradeTitle: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.bold, textAlign: "center" },
  upgradeDetail: {
    color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.regular,
    textAlign: "center", lineHeight: 19,
  },
  upgradeButton: {
    marginTop: 12, borderWidth: 1, borderRadius: RADIUS.small,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  upgradeButtonText: { fontSize: 14, fontFamily: FONTS.semiBold },
});
