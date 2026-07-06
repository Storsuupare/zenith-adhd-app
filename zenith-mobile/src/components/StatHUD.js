import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FONTS } from "../constants/fonts";
import { getRankName } from "../utils/ranks";

export default function StatHUD({ user, accentColor = "#22d3ee" }) {
  if (!user) return null;

  const level        = user.level ?? 1;
  const xp           = user.xp ?? 0;
  const totalXP      = user.total_xp ?? xp;
  const credits      = user.system_credits ?? 0;
  const streak       = user.streak ?? 0;
  const streakShield = user.streak_shield ?? false;
  const role         = user.role ?? "FREE";
  const nextLvlXP   = Math.max(1, Math.floor(100 * Math.pow(level, 1.6)));
  const xpToNext    = Math.max(0, nextLvlXP - xp);
  const pct         = Math.min((xp / nextLvlXP) * 100, 100);
  const rankName    = getRankName(level);

  const tierColor = role === "ELITE" ? "#fbbf24" : role === "PRO" ? accentColor : null;
  const tierNum   = role === "ELITE" ? 2 : role === "PRO" ? 1 : 0;
  const isElite   = role === "ELITE";

  return (
    <View style={[
      styles.container,
      isElite                   && { borderColor: "rgba(251,191,36,0.26)" },
      !isElite && tierNum === 1 && { borderColor: accentColor + "38" },
      !isElite && tierNum === 0 && { borderColor: accentColor + "22" },
    ]}>

      {/* ── Zone 1: Identity — rank name left, level right ── */}
      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <Text style={styles.rankName}>{rankName}</Text>
          {tierNum > 0 && (
            <View style={[
              styles.tierBadge,
              tierNum === 1
                ? { backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.28)" }
                : { backgroundColor: "rgba(251,191,36,0.10)", borderColor: "rgba(251,191,36,0.35)" },
            ]}>
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>{role}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.levelTag, { color: accentColor }]}>LVL {level}</Text>
      </View>

      {/* ── Zone 2: Progress bar + symmetric XP stats ── */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[accentColor, "rgba(255,255,255,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: "100%", width: `${pct}%`, borderRadius: 50 }}
        />
      </View>

      <View style={styles.xpRow}>
        <View>
          <Text style={styles.xpValue}>{totalXP.toLocaleString()}</Text>
          <Text style={styles.xpLabel}>TOTAL XP</Text>
        </View>
        <View style={styles.xpRightGroup}>
          <Text style={[styles.xpValue, styles.xpRightValue]}>{xpToNext.toLocaleString()}</Text>
          <Text style={[styles.xpLabel, styles.xpRightLabel]}>TO NEXT LVL</Text>
        </View>
      </View>

      {/* ── Zone 3: Credits left · streak right ── */}
      <View style={styles.footer}>
        <View style={styles.creditsGroup}>
          <Text style={[styles.creditsDiamond, { color: accentColor }]}>◈</Text>
          <Text style={styles.creditsValue}>{credits.toLocaleString()}</Text>
          <Text style={[styles.creditsLabel, { color: accentColor + "99" }]}>CR</Text>
        </View>

        {streak > 0 && (
          <View style={styles.streakGroup}>
            <Text style={styles.streakText}>{streak} DAY</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>+50 CR</Text>
            </View>
            {streakShield && (
              <View style={styles.shieldBadge}>
                <Text style={styles.shieldText}>SHIELD</Text>
              </View>
            )}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    16,
    padding:         16,
    gap:             10,
  },

  // ── Zone 1: Identity ──
  identityRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  identityLeft: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  rankName: {
    color:         "#ffffff",
    fontSize:      15,
    fontFamily:    FONTS.bold,
    letterSpacing: 0.2,
  },
  tierBadge: {
    borderWidth:       1,
    borderRadius:      3,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  tierBadgeText: {
    fontFamily:    FONTS.monoBold,
    fontSize:      9,
    letterSpacing: 2,
  },
  levelTag: {
    fontFamily:    FONTS.bold,
    fontSize:      13,
    letterSpacing: 0.5,
  },

  // ── Zone 2: XP ──
  progressTrack: {
    height:          6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    50,
    overflow:        "hidden",
  },
  xpRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
  },
  xpValue: {
    color:         "rgba(255,255,255,0.75)",
    fontSize:      15,
    fontFamily:    FONTS.semiBold,
    letterSpacing: -0.2,
  },
  xpLabel: {
    color:         "rgba(255,255,255,0.35)",
    fontSize:      11,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 1.2,
    marginTop:     2,
  },
  xpRightGroup: { alignItems: "flex-end" },
  xpRightValue: { textAlign: "right" },
  xpRightLabel: { textAlign: "right" },

  // ── Zone 3: Footer ──
  footer: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingTop:     6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  creditsGroup: {
    flexDirection: "row",
    alignItems:    "baseline",
    gap:           5,
  },
  creditsDiamond: {
    fontSize:   14,
    lineHeight: 18,
  },
  creditsValue: {
    color:         "#fbbf24",
    fontSize:      20,
    fontFamily:    FONTS.bold,
    letterSpacing: -0.5,
    lineHeight:    22,
  },
  creditsLabel: {
    fontSize:      11,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 1.5,
  },

  // ── Streak ──
  streakGroup: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
  },
  streakText: {
    color:         "#fb923c",
    fontSize:      11,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 1,
  },
  streakBadge: {
    backgroundColor: "rgba(251,146,60,0.1)",
    borderWidth:     1,
    borderColor:     "rgba(251,146,60,0.25)",
    borderRadius:    4,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  streakBadgeText: {
    color:      "#fb923c",
    fontSize:   9,
    fontFamily: FONTS.monoBold,
    letterSpacing: 0.5,
  },
  shieldBadge: {
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(59,130,246,0.3)",
    borderRadius:    4,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  shieldText: {
    color:      "#3b82f6",
    fontSize:   9,
    fontFamily: FONTS.monoBold,
    letterSpacing: 0.5,
  },
});
