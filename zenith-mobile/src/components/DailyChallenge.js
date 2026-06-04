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
  const [claiming, setClaiming] = useState(false);
  const challenge = getTodayChallenge();

  const raw = challenge.metric === "minutes"  ? minutesToday
            : challenge.metric === "skills"   ? skillsToday
            : sessionsToday;
  const progress  = Math.min(raw, challenge.target);
  const complete  = progress >= challenge.target;
  const pct       = Math.min((progress / challenge.target) * 100, 100);

  const handleClaim = useCallback(async () => {
    if (claiming || claimedToday || !complete) return;
    setClaiming(true);
    try { await onClaim(); } finally { setClaiming(false); }
  }, [claiming, claimedToday, complete, onClaim]);

  return (
    <View style={[s.card, claimedToday && s.cardDone]}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>DAILY CHALLENGE</Text>
        {claimedToday
          ? <Text style={s.doneBadge}>✓ CLAIMED</Text>
          : <Text style={s.reward}>+50 CR</Text>
        }
      </View>

      <Text style={s.challengeText}>{challenge.text}</Text>

      {/* Progress bar */}
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: claimedToday ? "#34d399" : accentColor }]} />
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.progressTxt}>
          <Text style={[s.progressVal, { color: accentColor }]}>{progress}</Text>
          <Text style={s.progressOf}> / {challenge.target}</Text>
        </Text>

        {complete && !claimedToday && (
          <TouchableOpacity style={[s.claimBtn, { backgroundColor: accentColor }]} onPress={handleClaim} disabled={claiming}>
            {claiming
              ? <ActivityIndicator size="small" color="#030712" />
              : <Text style={s.claimTxt}>CLAIM +50 CR</Text>
            }
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
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
