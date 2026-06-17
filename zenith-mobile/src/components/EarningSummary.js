import React, { useEffect, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

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

export default function EarningSummary({ data, onDismiss }) {
  const { accentColor } = useTheme() || {};
  const resolvedAccent = accentColor || COLORS.accent;
  const slideY  = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const skillKey   = data?.skillName?.toUpperCase() ?? "";
  const skillColor = SKILL_COLORS[skillKey] || resolvedAccent;
  const skillIcon  = SKILL_ICONS[skillKey] ?? "◉";

  useEffect(() => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [data]);

  if (!data) return null;

  const formattedXP = Number(data.xpGained).toLocaleString();

  const statRows = [
    data.duration   > 0           && { label: "Duration",   value: `${data.duration} min`,           valueColor: null },
    data.creditsEarned > 0        && { label: "Credits",    value: `+${data.creditsEarned} CR`,      valueColor: COLORS.gold },
    data.streak     > 0           && { label: "Streak",     value: `${data.streak} days`,            valueColor: "#f97316" },
    data.perkActive && data.xpMultiplier > 1 && { label: "Multiplier", value: `${data.xpMultiplier}×`, valueColor: resolvedAccent },
  ].filter(Boolean);

  return (
    <Modal transparent animationType="none" visible={!!data}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: skillColor + "33", transform: [{ translateY: slideY }], opacity },
          ]}
        >
          {/* Accent stripe */}
          <View style={[styles.topStripe, { backgroundColor: skillColor }]} />

          <View style={styles.body}>

            {/* Skill identifier */}
            <View style={styles.skillRow}>
              <Text style={[styles.skillIcon, { color: skillColor }]}>{skillIcon}</Text>
              <Text style={[styles.skillLabel, { color: skillColor }]}>
                {data.skillName ? data.skillName.toUpperCase() : "SESSION"}
              </Text>
            </View>

            {/* XP display */}
            <View style={styles.xpBlock}>
              <Text style={styles.xpCaption}>XP EARNED</Text>
              <Text style={[styles.xpValue, { color: skillColor }]}>+{formattedXP}</Text>
            </View>

            {/* Level-up badge */}
            {data.levelUp && (
              <View style={[styles.levelBadge, { borderColor: skillColor + "55", backgroundColor: skillColor + "12" }]}>
                <Text style={[styles.levelBadgeText, { color: skillColor }]}>
                  LEVEL {data.levelUp.level} · {data.levelUp.rank}
                </Text>
              </View>
            )}

            {/* Stat rows */}
            {statRows.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.statBlock}>
                  {statRows.map((statRow) => (
                    <View key={statRow.label} style={styles.statRow}>
                      <Text style={styles.statLabel}>{statRow.label}</Text>
                      <Text style={[styles.statValue, statRow.valueColor && { color: statRow.valueColor }]}>
                        {statRow.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.hint}>tap anywhere to continue</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "rgba(10,12,18,0.97)",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  topStripe: {
    height: 3,
    width: "100%",
    opacity: 0.8,
  },

  body: {
    padding: 24,
    alignItems: "center",
    gap: 14,
  },

  // ── Skill identifier ──────────────────────────────────────────
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  skillIcon:  { fontSize: 12 },
  skillLabel: {
    fontSize:      10,
    fontFamily:    FONTS.bold,
    letterSpacing: 2.5,
  },

  // ── XP display ───────────────────────────────────────────────
  xpBlock: {
    alignItems: "center",
    gap: 2,
  },
  xpCaption: {
    color:         COLORS.textMuted,
    fontSize:      9,
    fontFamily:    FONTS.bold,
    letterSpacing: 3,
  },
  xpValue: {
    fontSize:      38,
    fontFamily:    FONTS.monoBold,
    letterSpacing: -1,
    lineHeight:    44,
  },

  // ── Level-up badge ───────────────────────────────────────────
  levelBadge: {
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 12,
    paddingVertical:   5,
  },
  levelBadgeText: {
    fontSize:      10,
    fontFamily:    FONTS.bold,
    letterSpacing: 1.5,
  },

  // ── Stat rows ────────────────────────────────────────────────
  divider: {
    width:           "100%",
    height:          1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statBlock: {
    width: "100%",
    gap:   8,
  },
  statRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  statLabel: {
    color:      COLORS.textMuted,
    fontSize:   12,
    fontFamily: FONTS.regular,
  },
  statValue: {
    color:      COLORS.text,
    fontSize:   12,
    fontFamily: FONTS.semiBold,
  },

  // ── Hint ─────────────────────────────────────────────────────
  hint: {
    color:         COLORS.textMuted,
    fontSize:      10,
    fontFamily:    FONTS.regular,
    letterSpacing: 0.5,
    opacity:       0.5,
    marginTop:     2,
  },
});
