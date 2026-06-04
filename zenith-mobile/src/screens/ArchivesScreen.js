import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator,
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

export default function ArchivesScreen() {
  const { user } = useUser();
  const { accentColor } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchSummitHistory(20)
      .then(res => setSessions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const skills        = user?.mastery ?? [];
  const totalXP       = user?.total_xp ?? 0;
  const avgLevel      = skills.length
    ? Math.round(skills.reduce((acc, skill) => acc + (skill.current_level ?? 0), 0) / skills.length)
    : 0;
  const totalMinutes  = sessions.reduce((acc, session) => acc + (Number(session.minutes) || 0), 0);
  const totalHours    = (totalMinutes / 60).toFixed(1);
  const prestigeCount = skills.reduce((acc, skill) => acc + (skill.prestige_level ?? 0), 0);

  const sortedSkills = [...skills].sort((a, b) => (b.current_xp ?? 0) - (a.current_xp ?? 0));
  const topSkillXP   = sortedSkills.length ? Math.max(sortedSkills[0].current_xp ?? 1, 1) : 1;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Personal Records ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Personal Records</Text>
        <View style={styles.statsGrid}>
          {[
            { label: "Hours Logged",    value: `${totalHours}h` },
            { label: "Lifetime XP",     value: totalXP.toLocaleString() },
            { label: "Avg Skill Level", value: String(avgLevel) },
            { label: "Prestiges",       value: String(prestigeCount) },
          ].map(tile => (
            <View key={tile.label} style={styles.statTile}>
              <Text style={[styles.statValue, { color: accentColor }]}>{tile.value}</Text>
              <Text style={styles.statLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Skill XP Breakdown ──────────────────────────────────── */}
        {sortedSkills.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Skill XP</Text>
            <View style={styles.skillCard}>
              {sortedSkills.map((skill, index) => {
                const upperName = (skill.skill_name ?? "").toUpperCase();
                const color     = SKILL_COLORS[upperName] || accentColor;
                const icon      = SKILL_ICONS[upperName] ?? "◉";
                const fillPct   = ((skill.current_xp ?? 0) / topSkillXP) * 100;
                return (
                  <View
                    key={skill.skill_name}
                    style={[styles.skillRow, index > 0 && styles.skillRowDivider]}
                  >
                    <Text style={[styles.skillIcon, { color }]}>{icon}</Text>
                    <Text style={styles.skillName} numberOfLines={1}>{skill.skill_name}</Text>
                    <View style={styles.skillTrack}>
                      <View style={[styles.skillFill, { width: `${fillPct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.skillLevel}>Lv {skill.current_level}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Recent Sessions ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Recent Sessions</Text>
        {loading ? (
          <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyText}>No completed sessions yet.</Text>
          </View>
        ) : (() => {
          const maxMinutes = Math.max(...sessions.map(s => Number(s.minutes) || 0), 1);
          return (
            <View style={styles.sessionList}>
              {sessions.slice(0, 20).map((session, index) => {
                const upperSkill = (session.skill_name ?? "").toUpperCase();
                const dotColor   = SKILL_COLORS[upperSkill] || accentColor;
                const fillPct    = ((Number(session.minutes) || 0) / maxMinutes) * 100;
                return (
                  <View key={session.id ?? index} style={styles.sessionRow}>
                    <View style={[styles.sessionAccentBar, { backgroundColor: dotColor }]} />
                    <View style={styles.sessionBody}>
                      <View style={styles.sessionTopRow}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={styles.sessionDate}>{session.label}</Text>
                      </View>
                      <View style={styles.sessionBarRow}>
                        <Text style={styles.sessionSkillTag} numberOfLines={1}>
                          {session.skill_name || "Session"}
                        </Text>
                        <View style={styles.sessionTrack}>
                          <View style={[styles.sessionFill, { width: `${fillPct}%`, backgroundColor: dotColor }]} />
                        </View>
                        <Text style={styles.sessionDuration}>{session.minutes}m</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  pageTitle: { color: COLORS.text, fontSize: 20, fontFamily: FONTS.bold },

  content: { padding: 16, paddingBottom: 40, gap: 10 },

  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: FONTS.bold,
    marginTop: 8,
    marginBottom: 4,
  },

  // ── Stat tiles ──────────────────────────────────────────────
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  // ── Skill rows ──────────────────────────────────────────────
  skillCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    overflow: "hidden",
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  skillRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  skillIcon:  { fontSize: 13, width: 18, textAlign: "center" },
  // width: 106 fits the longest skill name ("Environment", "Discipline") at 12px semibold
  skillName:  {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    width: 106,
    flexShrink: 0,
  },
  skillTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  skillFill:  { height: "100%", borderRadius: 2 },
  skillLevel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.regular,
    width: 36,
    textAlign: "right",
  },

  // ── Session rows ────────────────────────────────────────────
  sessionList: { gap: 6 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    overflow: "hidden",
  },
  sessionAccentBar: { width: 3 },
  sessionBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  sessionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionTitle:    { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold, flex: 1, marginRight: 8 },
  sessionDate:     { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular, flexShrink: 0 },
  sessionBarRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  sessionSkillTag: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.regular, width: 72, flexShrink: 0 },
  sessionTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  sessionFill:     { height: "100%", borderRadius: 2 },
  sessionDuration: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular, width: 30, textAlign: "right" },

  // ── Empty state ─────────────────────────────────────────────
  emptyBox:  { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyIcon: { color: COLORS.textMuted, fontSize: 28 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
