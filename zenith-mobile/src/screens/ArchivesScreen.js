import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from "react-native";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { fetchSummitHistory } from "../services/api";

const SKILL_ICONS = {
  "LOGIC FLOW":  "⬡",
  VITALITY:      "◈",
  NUTRITION:     "◉",
  ENVIRONMENT:   "▣",
  EXECUTION:     "◎",
  LEARNING:      "⬢",
  LOGISTICS:     "▤",
  CREATIVITY:    "◆",
  DISCIPLINE:    "◫",
  PRESENCE:      "◑",
  RECOVERY:      "◌",
  RESOLVE:       "▲",
};

function SectionLabel({ text, sub }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{text}</Text>
      {sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

function StatGrid({ tiles, accentColor }) {
  return (
    <View style={styles.statGrid}>
      {tiles.map(tile => (
        <View key={tile.label} style={styles.statTile}>
          <Text style={[styles.statValue, { color: tile.color ?? accentColor }]}>{tile.value}</Text>
          <Text style={styles.statLabel}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ArchivesScreen() {
  const { user } = useUser();
  const { accentColor } = useTheme();
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = () =>
    fetchSummitHistory(50)
      .then(res => setSessions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));

  useEffect(() => { loadSessions(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const skills        = user?.mastery ?? [];
  const totalXP       = user?.total_xp ?? 0;
  const avgLevel      = skills.length
    ? Math.round(skills.reduce((sum, skill) => sum + (skill.current_level ?? 0), 0) / skills.length)
    : 0;
  const prestigeCount = skills.reduce((sum, skill) => sum + (skill.prestige_level ?? 0), 0);
  const allTimeMinutes = skills.length > 0
    ? sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0)
    : 0;

  // ── Performance: derived from 7-day sessions ──────────────────────────────
  const weekMinutes     = sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
  const weekHours       = (weekMinutes / 60).toFixed(1);
  const dailyAvgMinutes = Math.round(weekMinutes / 7);

  const skillFrequency = {};
  sessions.forEach(session => {
    const name = session.skill_name || "";
    if (name) skillFrequency[name] = (skillFrequency[name] || 0) + 1;
  });
  const topSkill = Object.entries(skillFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // ── Skill XP ──────────────────────────────────────────────────────────────
  const sortedSkills = [...skills].sort((a, b) => (b.current_xp ?? 0) - (a.current_xp ?? 0));
  const topSkillXP   = sortedSkills.length ? Math.max(sortedSkills[0].current_xp ?? 1, 1) : 1;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>History</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >

        {/* ── Personal Records ─────────────────────────────────────────── */}
        <SectionLabel text="Personal Records" />
        <StatGrid accentColor={accentColor} tiles={[
          { label: "Lifetime XP",     value: totalXP.toLocaleString() },
          { label: "Avg Skill Level", value: `Lv ${avgLevel}`         },
          { label: "Hours Logged",    value: `${(allTimeMinutes / 60).toFixed(1)}h` },
          { label: "Prestiges",       value: String(prestigeCount)    },
        ]} />

        {/* ── Performance ──────────────────────────────────────────────── */}
        <SectionLabel text="Performance" sub="Last 7 days" />
        {loading ? (
          <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />
        ) : (
          <StatGrid accentColor={accentColor} tiles={[
            { label: "Sessions",     value: String(sessions.length) },
            { label: "Time Logged",  value: `${weekHours}h`         },
            { label: "Top Skill",    value: topSkill || "—",  color: topSkill ? SKILL_COLORS[topSkill.toUpperCase()] : undefined },
            { label: "Daily Avg",    value: `${dailyAvgMinutes}m`   },
          ]} />
        )}

        {/* ── Skill XP ─────────────────────────────────────────────────── */}
        {sortedSkills.length > 0 && (
          <>
            <SectionLabel text="Skill XP" />
            <View style={styles.card}>
              {sortedSkills.map((skill, index) => {
                const upperName  = (skill.skill_name ?? "").toUpperCase();
                const skillColor = SKILL_COLORS[upperName] || accentColor;
                const icon       = SKILL_ICONS[upperName] ?? "◉";
                const fillPct    = ((skill.current_xp ?? 0) / topSkillXP) * 100;
                const xpDisplay  = (skill.current_xp ?? 0) >= 1000
                  ? `${((skill.current_xp ?? 0) / 1000).toFixed(1)}k`
                  : String(skill.current_xp ?? 0);
                return (
                  <View key={skill.skill_name} style={[styles.skillRow, index > 0 && styles.rowDivider]}>
                    <Text style={[styles.skillIcon, { color: skillColor }]}>{icon}</Text>
                    <View style={styles.skillMeta}>
                      <View style={styles.skillTopRow}>
                        <Text style={styles.skillName} numberOfLines={1}>{skill.skill_name}</Text>
                        <View style={styles.levelBadge}>
                          <Text style={[styles.levelText, { color: skillColor }]}>LV {skill.current_level ?? 0}</Text>
                        </View>
                        <Text style={[styles.xpValue, { color: skillColor }]}>{xpDisplay} XP</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${fillPct}%`, backgroundColor: skillColor }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Recent Sessions ──────────────────────────────────────────── */}
        <SectionLabel text="Recent Sessions" sub="Last 7 days" />
        {loading ? (
          <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyText}>No sessions in the last 7 days.</Text>
          </View>
        ) : (
          <View style={styles.sessionList}>
            {[...sessions].reverse().map((session, index) => {
              const upperSkill = (session.skill_name ?? "").toUpperCase();
              const skillColor = SKILL_COLORS[upperSkill] || accentColor;
              const icon       = SKILL_ICONS[upperSkill] ?? "◉";
              return (
                <View key={session.id ?? index} style={styles.sessionRow}>
                  <View style={[styles.sessionAccent, { backgroundColor: skillColor }]} />
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                    <View style={styles.sessionMeta}>
                      <Text style={[styles.sessionIcon]}>{icon}</Text>
                      <Text style={[styles.sessionSkill, { color: skillColor }]}>
                        {session.skill_name || "Session"}
                      </Text>
                      <View style={styles.sessionDot} />
                      <Text style={styles.sessionDate}>{session.label}</Text>
                      <View style={styles.sessionDot} />
                      <Text style={styles.sessionDuration}>{session.minutes}m</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: "transparent" },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  pageTitle: { color: COLORS.text, fontSize: 20, fontFamily: FONTS.bold },
  content:   { padding: 16, paddingBottom: 40, gap: 12 },

  // ── Section header ────────────────────────────────────────────
  sectionHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 },
  sectionLabel:  { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontFamily: FONTS.bold },
  sectionSub:    { color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: FONTS.regular },

  // ── Stat grid ─────────────────────────────────────────────────
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: {
    width:           "47.5%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.07)",
    borderRadius:    12,
    padding:         14,
    gap:             4,
  },
  statValue: { fontSize: 22, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  // ── Shared card ───────────────────────────────────────────────
  card: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.06)",
    borderRadius:    14,
    overflow:        "hidden",
  },

  // ── Skill XP rows ─────────────────────────────────────────────
  skillRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap:               10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" },
  skillIcon:  { fontSize: 14, width: 18, textAlign: "center" },
  skillMeta:  { flex: 1, gap: 5 },
  skillTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  skillName:  { color: COLORS.text, fontSize: 12, fontFamily: FONTS.semiBold, flex: 1 },
  levelBadge: {
    backgroundColor:   "rgba(255,255,255,0.07)",
    borderRadius:      4,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  levelText:  { fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  xpValue:    { fontSize: 10, fontFamily: FONTS.monoBold, letterSpacing: 0.5, opacity: 0.85 },
  barTrack: {
    height:          3,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    2,
    overflow:        "hidden",
  },
  barFill: { height: "100%", borderRadius: 2 },

  // ── Session rows ──────────────────────────────────────────────
  sessionList: { gap: 6 },
  sessionRow: {
    flexDirection:   "row",
    alignItems:      "stretch",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.06)",
    borderRadius:    10,
    overflow:        "hidden",
  },
  sessionAccent: { width: 3 },
  sessionBody: {
    flex:              1,
    paddingVertical:   10,
    paddingHorizontal: 12,
    gap:               4,
  },
  sessionTitle: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold },
  sessionMeta:  { flexDirection: "row", alignItems: "center", gap: 5 },
  sessionIcon:  { fontSize: 10, color: "rgba(255,255,255,0.4)" },
  sessionSkill: { fontSize: 11, fontFamily: FONTS.semiBold },
  sessionDot:   { width: 2, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  sessionDate:  { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },
  sessionDuration: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  // ── Empty state ───────────────────────────────────────────────
  emptyBox:  { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyIcon: { color: COLORS.textMuted, fontSize: 28 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.regular },
});
