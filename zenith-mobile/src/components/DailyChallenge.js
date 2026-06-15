import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../constants/fonts";

// metric drives which stat is used for progress:
//   sessions → sessions_today (count of completed sessions)
//   minutes  → minutes_today  (total minutes logged today)
//   skills   → skills_today   (distinct skills trained today)
const CHALLENGES = [
  { text: "Complete 3 sessions today",  target: 3,  metric: "sessions" },
  { text: "Log 60 minutes of focus",    target: 60, metric: "minutes"  },
  { text: "Log 30 minutes of focus",    target: 30, metric: "minutes"  },
  { text: "Train 3 different skills",   target: 3,  metric: "skills"   },
  { text: "Complete 5 sessions today",  target: 5,  metric: "sessions" },
  { text: "Log 90 minutes of focus",    target: 90, metric: "minutes"  },
  { text: "Log 60 minutes of focus",    target: 60, metric: "minutes"  },
];

function getTodayChallenge() {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000);
  return CHALLENGES[day % CHALLENGES.length];
}

export default function DailyChallenge({ sessionsToday = 0, minutesToday = 0, skillsToday = 0, claimedToday, onClaim }) {
  const { accentColor } = useTheme();
  const [claiming,      setClaiming]      = useState(false);
  const [localClaimed,  setLocalClaimed]  = useState(false);
  const challenge = getTodayChallenge();

  const claimed = claimedToday || localClaimed;

  const raw = challenge.metric === "minutes"  ? minutesToday
            : challenge.metric === "skills"   ? skillsToday
            : sessionsToday;
  const progress = Math.min(raw, challenge.target);
  const complete = progress >= challenge.target;
  const pct      = Math.min((progress / challenge.target) * 100, 100);

  const handleClaim = useCallback(async () => {
    if (claiming || claimed || !complete) return;
    setClaiming(true);
    try {
      await onClaim();
      setLocalClaimed(true);
    } catch {
      setLocalClaimed(true);
    } finally {
      setClaiming(false);
    }
  }, [claiming, claimed, complete, onClaim]);

  return (
    <View style={[styles.card, claimed && styles.cardDone]}>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>DAILY CHALLENGE</Text>
        {claimed
          ? <Text style={styles.doneBadge}>✓ CLAIMED</Text>
          : <Text style={styles.reward}>+50 CR</Text>
        }
      </View>

      <Text style={styles.challengeText}>{challenge.text}</Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: claimed ? "#34d399" : accentColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressTxt}>
          <Text style={[styles.progressVal, { color: accentColor }]}>{progress}</Text>
          <Text style={styles.progressOf}> / {challenge.target}</Text>
        </Text>

        {complete && !claimed && (
          <TouchableOpacity style={[styles.claimBtn, { backgroundColor: accentColor }]} onPress={handleClaim} disabled={claiming}>
            {claiming
              ? <ActivityIndicator size="small" color="#030712" />
              : <Text style={styles.claimTxt}>CLAIM +50 CR</Text>
            }
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.07)",
    borderRadius:    12,
    padding:         14,
    gap:             10,
  },
  cardDone: {
    borderColor:     "rgba(52,211,153,0.25)",
    backgroundColor: "rgba(52,211,153,0.04)",
  },

  header: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  eyebrow: {
    color:         "rgba(255,255,255,0.3)",
    fontSize:      9,
    fontFamily:    FONTS.bold,
    letterSpacing: 2.5,
  },
  doneBadge: {
    color:         "#34d399",
    fontSize:      10,
    fontFamily:    FONTS.bold,
    letterSpacing: 1,
  },
  reward: {
    color:      "#fbbf24",
    fontSize:   11,
    fontFamily: FONTS.bold,
  },

  challengeText: {
    color:      "#f8fafc",
    fontSize:   14,
    fontFamily: FONTS.semiBold,
    lineHeight: 20,
  },

  barTrack: {
    height:          4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius:    2,
    overflow:        "hidden",
  },
  barFill: {
    height:          "100%",
    backgroundColor: "#22d3ee",
    borderRadius:    2,
  },
  barDone: {
    backgroundColor: "#34d399",
  },

  footer: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  progressTxt: { flexDirection: "row" },
  progressVal: {
    color:      "#22d3ee",
    fontSize:   14,
    fontFamily: FONTS.bold,
  },
  progressOf: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   14,
    fontFamily: FONTS.regular,
  },

  claimBtn: {
    backgroundColor:   "#22d3ee",
    borderRadius:      6,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  claimTxt: {
    color:         "#030712",
    fontSize:      10,
    fontFamily:    FONTS.bold,
    letterSpacing: 1,
  },
});
