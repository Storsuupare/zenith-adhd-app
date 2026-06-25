import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/fonts";
import { getRankName } from "../utils/ranks";

function getStreakMultiplier(streak) {
  if (!streak) return null;
  return (1 + Math.min(streak * 0.05, 0.5)).toFixed(2);
}

export default function StatHUD({ user, accentColor = "#22d3ee" }) {
  if (!user) return null;

  const level     = user.level ?? 1;
  const xp        = user.xp ?? 0;
  const totalXP   = user.total_xp ?? xp;
  const credits   = user.system_credits ?? 0;
  const streak    = user.streak ?? 0;
  const role      = user.role ?? "FREE";
  const nextLvlXP = Math.max(1, Math.floor(100 * Math.pow(level, 1.8)));
  const xpToNext  = Math.max(0, nextLvlXP - xp);
  const pct       = Math.min((xp / nextLvlXP) * 100, 100);
  const rankName  = getRankName(level);
  const multi     = getStreakMultiplier(streak);

  const tierColor  = role === "ELITE" ? "#fbbf24" : role === "PRO" ? accentColor : null;
  const tierNum    = role === "ELITE" ? 2 : role === "PRO" ? 1 : 0;
  const isElite    = role === "ELITE";

  return (
    <View style={[
      styles.container,
      isElite && { borderColor: "rgba(251,191,36,0.26)" },
      !isElite && tierNum === 1 && { borderColor: "rgba(34,211,238,0.22)" },
    ]}>

      {/* ── Top row: rank name/level · total XP ── */}
      <View style={styles.topRow}>
        <View style={styles.rankGroup}>
          {/* RANK label + tier badge */}
          <View style={styles.rankLabelRow}>
            <Text style={styles.rankLabel}>RANK</Text>
            {tierNum > 0 && (
              <View style={[
                styles.tierBadge,
                tierNum === 1
                  ? { backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.28)" }
                  : { backgroundColor: "rgba(251,191,36,0.10)",  borderColor: "rgba(251,191,36,0.35)" },
              ]}>
                <Text style={[styles.tierBadgeText, { color: tierColor }]}>{role}</Text>
              </View>
            )}
          </View>
          {/* Rank name + LVL */}
          <View style={styles.rankNameRow}>
            <Text style={styles.rankText}>{rankName}</Text>
            <Text style={[styles.lvlTag, { color: accentColor }]}>LVL {level}</Text>
          </View>
        </View>

        {/* Total XP */}
        <View style={styles.xpGroup}>
          <Text style={styles.totalXP}>{totalXP.toLocaleString()}</Text>
          <Text style={[styles.xpSuffix, { color: accentColor }]}>TOTAL XP</Text>
        </View>
      </View>

      {/* ── XP progress bar: accent → white (matches web gradient) ── */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[accentColor, "rgba(255,255,255,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: "100%", width: `${pct}%`, borderRadius: 50 }}
        />
      </View>

      {/* ── Bottom row: XP remaining · streak ── */}
      <View style={styles.bottomRow}>
        <Text style={styles.xpRemaining}>{xpToNext.toLocaleString()} XP TO NEXT LEVEL</Text>

        {streak > 0 && (
          <View style={styles.streakDisplay}>
            <Text style={[styles.streakText, styles.momentumActive]}>
              🔥 {streak} DAY STREAK
            </Text>
            {multi && (
              <View style={styles.multBadge}>
                <Text style={[styles.multText, styles.momentumActive]}>×{multi} XP</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Credits row ── */}
      <View style={styles.creditsRow}>
        <Text style={[styles.creditsDiamond, { color: accentColor }]}>◈</Text>
        <Text style={styles.creditsValue}>{credits.toLocaleString()}</Text>
        <Text style={styles.creditsLabel}>CR</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    18,
    padding:         20,
    marginBottom:    4,
    gap:             12,
  },

  // ── Top row ──
  topRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-end",
  },
  rankGroup: { gap: 3 },
  rankLabelRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  rankLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 2.5,
    color:         "rgba(255,255,255,0.38)",
    textTransform: "uppercase",
  },
  tierBadge: {
    borderWidth:       1,
    borderRadius:      3,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  tierBadgeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "800",
    letterSpacing: 2.5,
  },
  rankNameRow: {
    flexDirection: "row",
    alignItems:    "baseline",
    gap:           14,
  },
  rankText: {
    fontFamily:    FONTS.black,
    fontSize:      18,
    fontWeight:    "800",
    letterSpacing: -0.5,
    color:         "#ffffff",
    lineHeight:    22,
  },
  lvlTag: {
    fontFamily:    FONTS.bold,
    fontSize:      14,
    fontWeight:    "700",
    letterSpacing: 0,
  },

  // ── Total XP ──
  xpGroup:  { alignItems: "flex-end", gap: 2 },
  totalXP: {
    fontFamily:    FONTS.black,
    fontSize:      18,
    fontWeight:    "800",
    letterSpacing: -0.5,
    color:         "#ffffff",
    lineHeight:    18,
  },
  xpSuffix: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 2,
    opacity:       0.8,
  },

  // ── Progress bar ──
  progressTrack: {
    height:          8,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    50,
    overflow:        "hidden",
  },

  // ── Bottom row ──
  bottomRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    flexWrap:       "wrap",
    gap:            6,
  },
  xpRemaining: {
    fontFamily:    FONTS.semiBold,
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: 0.5,
    color:         "rgba(255,255,255,0.38)",
    textTransform: "uppercase",
  },
  streakDisplay: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  streakText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 1.5,
    color:         "rgba(255,255,255,0.38)",
    textTransform: "uppercase",
  },
  momentumActive: { color: "#fb923c" },
  multBadge: {
    backgroundColor: "rgba(251,146,60,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(251,146,60,0.2)",
    borderRadius:    4,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  multText: {
    fontFamily: FONTS.monoBold,
    fontSize:   11,
  },

  // ── Credits ──
  creditsRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            8,
    paddingTop:     8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  creditsDiamond: {
    fontSize:   16,
    lineHeight: 18,
  },
  creditsValue: {
    fontFamily:    FONTS.black,
    fontSize:      22,
    fontWeight:    "800",
    letterSpacing: -0.5,
    color:         "#fbbf24",
    lineHeight:    24,
  },
  creditsLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 2,
    color:         "rgba(255,255,255,0.28)",
    paddingBottom: 2,
  },
});
