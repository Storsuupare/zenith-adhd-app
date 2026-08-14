import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Share,
} from "react-native";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { SKILL_ICONS } from "../constants/skills";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import { fetchSummitHistory, exportSessionsCsv } from "../services/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVITY_CHART_DAYS = 7;

function startOfDay(value) {
  const dayStart = new Date(value);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function buildWeeklyActivity(sessions) {
  const today = startOfDay(new Date());
  const days  = [];

  for (let dayOffset = ACTIVITY_CHART_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    days.push({ key: date.toDateString(), label: WEEKDAY_LABELS[date.getDay()], minutes: 0 });
  }

  const daysByKey = new Map(days.map(day => [day.key, day]));
  sessions.forEach(session => {
    if (!session.completed_at) return;
    const day = daysByKey.get(startOfDay(session.completed_at).toDateString());
    if (day) day.minutes += Number(session.minutes) || 0;
  });

  return days;
}

function describeDay(date) {
  const today     = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime())     return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

function groupSessionsByDay(sessions) {
  const groups     = [];
  const groupByKey = new Map();

  [...sessions]
    .sort((first, second) => new Date(second.completed_at) - new Date(first.completed_at))
    .forEach(session => {
      const sessionDay = startOfDay(session.completed_at ?? new Date());
      const groupKey   = sessionDay.toDateString();

      let group = groupByKey.get(groupKey);
      if (!group) {
        group = { key: groupKey, label: describeDay(sessionDay), totalMinutes: 0, sessions: [] };
        groupByKey.set(groupKey, group);
        groups.push(group);
      }

      group.sessions.push(session);
      group.totalMinutes += Number(session.minutes) || 0;
    });

  return groups;
}

function SectionLabel({ text, detail }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function StatGrid({ tiles, accentColor }) {
  return (
    <View style={styles.statGrid}>
      {tiles.map(tile => (
        <View key={tile.label} style={styles.statTile}>
          <Text style={[styles.statValue, { color: tile.color ?? accentColor }]} numberOfLines={1}>
            {tile.value}
          </Text>
          <Text style={styles.statLabel}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
}

function WeeklyActivityChart({ days, accentColor }) {
  const peakMinutes = Math.max(...days.map(day => day.minutes), 1);
  const todayKey    = startOfDay(new Date()).toDateString();

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartPlot}>
        {days.map(day => {
          const isToday   = day.key === todayKey;
          const hasData   = day.minutes > 0;
          const barHeight = hasData ? Math.max((day.minutes / peakMinutes) * 100, 6) : 2;

          return (
            <View key={day.key} style={styles.chartColumn}>
              <Text style={[styles.chartValue, !hasData && styles.chartValueEmpty]}>
                {hasData ? `${day.minutes}m` : ""}
              </Text>
              <View style={styles.chartBarSlot}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height:          `${barHeight}%`,
                      backgroundColor: hasData ? accentColor : "rgba(255,255,255,0.1)",
                      opacity:         hasData && !isToday ? 0.65 : 1,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartDay, isToday && { color: accentColor }]}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ArchivesScreen() {
  const { user } = useUser();
  const { accentColor } = useTheme();
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting,  setExporting]  = useState(false);

  const accountTier  = user?.account_tier ?? 0;
  const isPro        = accountTier >= 1;
  const historyLabel = accountTier >= 2 ? "All time" : accountTier >= 1 ? "Last 6 months" : "Last 7 days";
  const historyLimit = accountTier >= 2 ? 500 : accountTier >= 1 ? 200 : 50;

  const loadSessions = useCallback(
    () =>
      fetchSummitHistory(historyLimit)
        .then(response => setSessions(Array.isArray(response.data) ? response.data : []))
        .catch(() => setSessions([]))
        .finally(() => setLoading(false)),
    [historyLimit],
  );

  useEffect(() => { loadSessions(); }, [loadSessions, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await exportSessionsCsv();
      const csvText  = await response.data.text();
      await Share.share({ message: csvText, title: "zenith-sessions.csv" });
    } catch {
      Alert.alert("Export failed", "Could not export session data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const skills        = user?.mastery ?? [];
  const lifetimeXP    = user?.total_xp ?? 0;
  const currentStreak = user?.streak ?? 0;
  const averageLevel  = skills.length
    ? Math.round(skills.reduce((total, skill) => total + (skill.current_level ?? 0), 0) / skills.length)
    : 0;
  const prestigeCount = skills.reduce((total, skill) => total + (skill.prestige_level ?? 0), 0);

  const windowMinutes = sessions.reduce((total, session) => total + (Number(session.minutes) || 0), 0);
  const windowHours   = (windowMinutes / 60).toFixed(1);

  const activeDayKeys = new Set(
    sessions.filter(session => session.completed_at)
            .map(session => startOfDay(session.completed_at).toDateString()),
  );
  const activeDayCount   = activeDayKeys.size;
  const minutesPerActive = activeDayCount > 0 ? Math.round(windowMinutes / activeDayCount) : 0;

  const sessionsBySkill = {};
  sessions.forEach(session => {
    const skillName = session.skill_name || "";
    if (skillName) sessionsBySkill[skillName] = (sessionsBySkill[skillName] || 0) + 1;
  });
  const topSkill = Object.entries(sessionsBySkill).sort((first, second) => second[1] - first[1])[0]?.[0];

  const weeklyActivity = buildWeeklyActivity(sessions);
  const sessionGroups  = groupSessionsByDay(sessions);
  const weeklyMinutes  = weeklyActivity.reduce((total, day) => total + day.minutes, 0);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="History" subtitle={historyLabel}>
        {isPro && (
          <TouchableOpacity
            style={[styles.exportButton, { borderColor: accentColor + "55" }, exporting && { opacity: 0.5 }]}
            onPress={handleExportCsv}
            disabled={exporting}
          >
            <Text style={[styles.exportButtonText, { color: accentColor }]}>
              {exporting ? "Exporting…" : "Export CSV"}
            </Text>
          </TouchableOpacity>
        )}
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >

        <SectionLabel text="This week" detail={`${(weeklyMinutes / 60).toFixed(1)}h focused`} />
        {loading ? (
          <ActivityIndicator color={accentColor} style={styles.sectionSpinner} />
        ) : (
          <WeeklyActivityChart days={weeklyActivity} accentColor={accentColor} />
        )}

        <SectionLabel text="Performance" detail={historyLabel} />
        {loading ? (
          <ActivityIndicator color={accentColor} style={styles.sectionSpinner} />
        ) : (
          <StatGrid
            accentColor={accentColor}
            tiles={[
              { label: "Sessions",        value: String(sessions.length) },
              { label: "Time focused",    value: `${windowHours}h` },
              { label: "Active days",     value: String(activeDayCount) },
              { label: "Avg / active day", value: `${minutesPerActive}m` },
            ]}
          />
        )}

        <SectionLabel text="All time" />
        <StatGrid
          accentColor={accentColor}
          tiles={[
            { label: "Lifetime XP",     value: lifetimeXP.toLocaleString() },
            { label: "Avg skill level", value: `Lv ${averageLevel}` },
            { label: "Current streak",  value: `${currentStreak}d` },
            {
              label: "Top skill",
              value: topSkill ?? "—",
              color: topSkill ? SKILL_COLORS[topSkill.toUpperCase()] : undefined,
            },
          ]}
        />
        {prestigeCount > 0 && (
          <Text style={styles.prestigeNote}>
            {prestigeCount} prestige{prestigeCount === 1 ? "" : "s"} earned across your skills.
          </Text>
        )}

        <SectionLabel text="Sessions" detail={historyLabel} />
        {loading ? (
          <ActivityIndicator color={accentColor} style={styles.sectionSpinner} />
        ) : sessionGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyDetail}>
              Finished sessions from {historyLabel.toLowerCase()} will appear here.
            </Text>
          </View>
        ) : (
          sessionGroups.map(group => (
            <View key={group.key} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{group.label}</Text>
                <Text style={styles.dayTotal}>
                  {group.sessions.length} · {group.totalMinutes}m
                </Text>
              </View>

              <View style={styles.dayCard}>
                {group.sessions.map((session, sessionIndex) => {
                  const skillKey   = (session.skill_name ?? "").toUpperCase();
                  const skillColor = SKILL_COLORS[skillKey] || accentColor;

                  return (
                    <View
                      key={session.id ?? `${group.key}-${sessionIndex}`}
                      style={[styles.sessionRow, sessionIndex > 0 && styles.sessionRowDivided]}
                    >
                      <Text style={[styles.sessionIcon, { color: skillColor }]}>
                        {SKILL_ICONS[skillKey] ?? "◉"}
                      </Text>
                      <View style={styles.sessionBody}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={[styles.sessionSkill, { color: skillColor }]}>
                          {session.skill_name || "Session"}
                        </Text>
                      </View>
                      <Text style={styles.sessionDuration}>{session.minutes}m</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {!isPro && (
          <View style={styles.upgradeNotice}>
            <Text style={styles.upgradeNoticeText}>
              PRO unlocks 6 months of history, prestige, and CSV export.
              ELITE unlocks all-time history and an auto-replenishing streak shield.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: SPACING.screenPadding, paddingBottom: 40, gap: 10 },

  exportButton: {
    borderWidth:       1,
    borderRadius:      RADIUS.small,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  exportButtonText: { fontSize: 11, fontFamily: FONTS.monoBold, letterSpacing: 1 },

  sectionHeader: {
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "space-between",
    gap:            8,
    marginTop:      8,
  },
  sectionLabel: {
    color:         COLORS.textMuted,
    fontSize:      10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily:    FONTS.bold,
  },
  sectionDetail:  { color: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: FONTS.regular },
  sectionSpinner: { marginVertical: 16 },

  chartCard: {
    backgroundColor: SURFACE.card,
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.medium,
    padding:         14,
  },
  chartPlot: {
    flexDirection:  "row",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    gap:            6,
  },
  chartColumn:  { flex: 1, alignItems: "center", gap: 5 },
  chartValue: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   9,
    fontFamily: FONTS.monoBold,
    height:     12,
  },
  chartValueEmpty: { color: "transparent" },
  chartBarSlot: {
    height:        76,
    width:         "100%",
    justifyContent: "flex-end",
    alignItems:    "center",
  },
  chartBar: { width: "62%", borderRadius: 3, minHeight: 2 },
  chartDay: {
    color:         "rgba(255,255,255,0.35)",
    fontSize:      10,
    fontFamily:    FONTS.semiBold,
    letterSpacing: 0.3,
  },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: {
    flexGrow:        1,
    flexBasis:       "46%",
    backgroundColor: SURFACE.card,
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.medium,
    padding:         14,
    gap:             4,
  },
  statValue: { fontSize: 21, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  prestigeNote: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   11,
    fontFamily: FONTS.regular,
    marginTop:  2,
  },

  dayGroup:  { gap: 6, marginTop: 4 },
  dayHeader: {
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "space-between",
  },
  dayLabel: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold },
  dayTotal: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: FONTS.monoBold },
  dayCard: {
    backgroundColor: SURFACE.card,
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.medium,
    overflow:        "hidden",
  },

  sessionRow: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   11,
  },
  sessionRowDivided: { borderTopWidth: 1, borderTopColor: SURFACE.inset },
  sessionIcon:       { fontSize: 14, width: 18, textAlign: "center" },
  sessionBody:       { flex: 1, gap: 2 },
  sessionTitle:      { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold },
  sessionSkill:      { fontSize: 11, fontFamily: FONTS.regular },
  sessionDuration: {
    color:      COLORS.textMuted,
    fontSize:   12,
    fontFamily: FONTS.monoBold,
    flexShrink: 0,
  },

  emptyState:  { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyIcon:   { color: COLORS.textMuted, fontSize: 28, marginBottom: 2 },
  emptyTitle:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  emptyDetail: {
    color:      COLORS.textMuted,
    fontSize:   12,
    fontFamily: FONTS.regular,
    textAlign:  "center",
    paddingHorizontal: 24,
  },

  upgradeNotice: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.medium,
    padding:         14,
    marginTop:       10,
  },
  upgradeNoticeText: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
    textAlign:  "center",
  },
});
