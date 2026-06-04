import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { prestigeSkill } from "../services/api";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

const PRESTIGE_COST = 3500;

// Matches web getTier()
function getTierKey(level) {
  if (level >= 50) return "vanguard";
  if (level >= 10) return "adept";
  return "novice";
}

// Matches web TIER_STYLE — colors, gradient bar colors, tier card bg
const TIER = {
  novice:   {
    label:          "NOVICE",
    color:          "rgba(255,255,255,0.28)",
    gradientColors: ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.5)"],
    borderColor:    "rgba(255,255,255,0.07)",
    cardBg:         "rgba(0,0,0,0.22)",
  },
  adept:    {
    label:          "ADEPT",
    color:          "#00f5ff",
    gradientColors: ["#0096c7", "#00f5ff", "#ade8f4"],
    borderColor:    "rgba(0,245,255,0.2)",
    cardBg:         "rgba(0,18,28,0.26)",
  },
  vanguard: {
    label:          "VANGUARD",
    color:          "#ff0040",
    gradientColors: ["#c9184a", "#ff0040", "#ff758f"],
    borderColor:    "rgba(255,0,64,0.3)",
    cardBg:         "rgba(22,0,10,0.26)",
  },
};

// Matches web SKILL_DATA
const SKILL_DATA = {
  "LOGIC FLOW":  { icon: "⬡", benefit: "Sharpens analytical thinking, pattern recognition, and problem-solving under pressure.", trains: ["Coding", "Debugging", "Math", "Chess", "Algorithm", "SQL", "Python"] },
  "VITALITY":    { icon: "◈", benefit: "Boosts energy, focus, and mood — your body is your most important productivity tool.", trains: ["Gym", "Workout", "Running", "Cardio", "HIIT", "Yoga", "Lifting"] },
  "NUTRITION":   { icon: "◉", benefit: "Fuels consistent energy levels and keeps your brain sharp throughout the day.", trains: ["Healthy Meal", "Meal Prep", "Cooking", "Hydration", "Groceries"] },
  "ENVIRONMENT": { icon: "▣", benefit: "A cleaner space means a clearer head.", trains: ["Cleaning", "Chores", "Dishes", "Laundry", "Organizing", "Tidying"] },
  "EXECUTION":   { icon: "◎", benefit: "The skill of actually doing the work — sitting down, starting, and seeing it through.", trains: ["Work Session", "Project", "Pomodoro", "Sprint", "Task Sprint", "Grind"] },
  "LEARNING":    { icon: "⬢", benefit: "Builds knowledge that stacks over time — the more you learn, the faster you learn.", trains: ["Reading", "Study", "Research", "Note Taking", "Flashcards", "Course"] },
  "LOGISTICS":   { icon: "▤", benefit: "Keeps your life organised and your head clear — fewer open loops, more focus.", trains: ["Organisation", "Email", "Planning", "Scheduling", "Errands", "Calendar"] },
  "CREATIVITY":  { icon: "◆", benefit: "Trains your brain to think differently and express ideas in ways only you can.", trains: ["Drawing", "Writing", "Music", "Design", "Art", "Photography", "Guitar"] },
  "DISCIPLINE":  { icon: "◫", benefit: "Builds the habit infrastructure that makes everything else easier — routines become automatic.", trains: ["Habit", "Routine", "Morning Routine", "Practice", "Self-improvement", "Ritual"] },
  "PRESENCE":    { icon: "◑", benefit: "Strengthens real connections — the people in your life are part of your progress too.", trains: ["Meeting", "Call", "Networking", "Friends", "Family", "Dating", "Hangout"] },
  "RECOVERY":    { icon: "◌", benefit: "Rest isn't laziness — it's how your brain resets and locks in everything you've worked on.", trains: ["Meditation", "Sleep", "Nap", "Breathing", "Journaling", "Rest", "Bath"] },
  "RESOLVE":     { icon: "▲", benefit: "Doing the hard thing anyway — this skill grows every time you push through resistance.", trains: ["Hard Task", "Challenge", "Cold Shower", "Therapy", "Discipline", "Mindset"] },
};

function SkillCard({ skill, onPrestige, accentColor, isPrestiging }) {
  const ACCENT = accentColor || "#22d3ee";
  const [expanded, setExpanded] = useState(false);

  const level      = skill.current_level ?? 0;
  const xp         = skill.current_xp ?? 0;
  const nextXP     = skill.next_level_xp ?? 100;
  const prestige   = skill.prestige_level ?? 0;
  const pct        = Math.min((xp / Math.max(nextXP, 1)) * 100, 100);
  const name       = (skill.skill_name || "").toUpperCase();
  const tierKey    = getTierKey(level);
  const tier       = TIER[tierKey];
  const data       = SKILL_DATA[name];
  const canPrestige = level >= 99;
  const boostActive = skill.prestige_boost_until && new Date(skill.prestige_boost_until) > new Date();

  const handleToggle = () => {
    Haptics.selectionAsync();
    setExpanded(v => !v);
  };

  return (
    <TouchableOpacity
      style={[s.card, { borderColor: tier.borderColor, backgroundColor: tier.cardBg }]}
      onPress={handleToggle}
      activeOpacity={0.85}
    >

      {/* LVL badge row — matches .skill-lvl-row */}
      <View style={s.lvlRow}>
        <View style={s.lvlBadge}>
          <Text style={[s.lvlText, { color: ACCENT }]}>LVL {level}</Text>
        </View>
        {level >= 2 && !canPrestige && (
          <Text style={[s.xpBonus, { color: tier.color }]}>+{level * 5}% XP</Text>
        )}
        {prestige > 0 && (
          <Text style={s.prestigeStars}>{"★".repeat(Math.min(prestige, 5))}</Text>
        )}
        {data && (
          <Text style={[s.iconBadge, { color: ACCENT }, expanded && { opacity: 1 }]}>
            {data.icon}
          </Text>
        )}
      </View>

      {/* Skill name + XP fraction — matches .skill-top-row */}
      <View style={s.topRow}>
        <Text style={s.skillName} numberOfLines={1}>
          {name}
          {boostActive && <Text style={s.boostBadge}> 2×</Text>}
        </Text>
        {!canPrestige && (
          <View style={s.xpFractionGroup}>
            <Text style={s.xpVal}>{xp.toLocaleString()}</Text>
            <Text style={s.xpDim}> / {nextXP.toLocaleString()} </Text>
            <Text style={[s.xpLabel, { color: ACCENT }]}>XP</Text>
          </View>
        )}
      </View>

      {!canPrestige ? (
        <>
          {/* Progress bar — matches .skill-track + .skill-fill with tier gradient */}
          <View style={s.barTrack}>
            <LinearGradient
              colors={tier.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.barFill, { width: `${pct}%` }]}
            />
          </View>
          {/* Matches .skill-percent-readout */}
          <Text style={s.percentReadout}>{Math.floor(pct)}% TO NEXT LEVEL</Text>
        </>
      ) : (
        /* Matches .prestige-trigger-btn */
        <TouchableOpacity
          style={s.prestigeBtn}
          onPress={() => onPrestige(skill.skill_name)}
          disabled={isPrestiging}
          activeOpacity={0.85}
        >
          {isPrestiging
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.prestigeBtnText}>PRESTIGE SKILL</Text>
                <Text style={s.prestigeBtnSub}>RESET TO LVL 1 · +10% XP · {PRESTIGE_COST.toLocaleString()} CR</Text>
              </>
          }
        </TouchableOpacity>
      )}

      {/* Expanded training panel — matches .skill-training-panel */}
      {expanded && data && (
        <View style={s.trainingPanel}>
          <Text style={s.syncedLabel}>◈ SYNCED</Text>
          <Text style={s.trainingBenefit}>{data.benefit}</Text>
          <Text style={[s.trainsLabel, { color: ACCENT }]}>TRAINS VIA</Text>
          {data.trains.map(m => (
            <View key={m} style={s.trainItem}>
              <Text style={[s.trainDot, { color: ACCENT }]}>▸</Text>
              <Text style={s.trainText}>{m}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Matches .skill-info-trigger */}
      <Text style={[s.infoTrigger, expanded && { color: ACCENT }]}>
        {expanded ? "▴ collapse" : "▾ what trains this?"}
      </Text>

    </TouchableOpacity>
  );
}

export default function SkillsScreen() {
  const { user, fetchUser } = useUser();
  const { accentColor } = useTheme();
  const skills = user?.mastery ?? [];
  const [prestiging, setPrestiging] = useState(null);

  const handlePrestige = (skillName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Prestige Skill",
      `Reset ${skillName} to Level 1?\n\nYou earn a permanent +10% XP bonus to this skill. ${PRESTIGE_COST.toLocaleString()} CR will be deducted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Prestige",
          style: "destructive",
          onPress: async () => {
            setPrestiging(skillName);
            try {
              await prestigeSkill(skillName);
              await fetchUser();
            } catch (e) {
              Alert.alert("Failed", e.response?.data?.error || "Something went wrong.");
            } finally {
              setPrestiging(null);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.pageTitle}>SKILLS</Text>
        <Text style={s.creditLabel}>◈ {(user.system_credits ?? 0).toLocaleString()} CR</Text>
      </View>

      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {skills.length === 0 ? (
          <Text style={s.empty}>Start sessions to unlock skills.</Text>
        ) : (
          skills.map(skill => (
            <SkillCard
              key={skill.skill_name}
              skill={skill}
              onPrestige={handlePrestige}
              accentColor={accentColor}
              isPrestiging={prestiging === skill.skill_name}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },

  // Matches .operative-status-column top bar
  topBar: {
    flexDirection:     "row",
    justifyContent:    "space-between",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    backgroundColor:   "rgba(0,0,0,0.22)",
  },
  pageTitle: {
    color:         "#ffffff",
    fontSize:      14,
    fontFamily:    FONTS.black,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  creditLabel: {
    color:      "#fbbf24",
    fontSize:   13,
    fontFamily: FONTS.semiBold,
  },

  // 2-column grid — matches .skill-grid
  grid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    padding:       8,
    gap:           8,
    paddingBottom: 40,
  },

  // Matches .skill-card (mobile breakpoint)
  card: {
    width:             "47%",
    borderWidth:       1,
    borderRadius:      11,
    paddingVertical:   10,
    paddingHorizontal: 9,
    minHeight:         90,
  },

  // Matches .skill-lvl-row
  lvlRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            4,
    marginBottom:   6,
    flexWrap:       "wrap",
  },

  // Matches .skill-lvl pill
  lvlBadge: {
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      5,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  lvlText: {
    fontFamily:    FONTS.bold,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 0.5,
  },

  // Matches .skill-xp-bonus
  xpBonus: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 0.6,
    opacity:       0.7,
  },

  // Matches .skill-prestige-stars
  prestigeStars: {
    color:      "#fbbf24",
    fontSize:   11,
    lineHeight: 14,
  },

  // Matches .skill-icon-badge
  iconBadge: {
    marginLeft: "auto",
    fontSize:   13,
    opacity:    0.55,
  },

  // Matches .skill-top-row
  topRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "baseline",
    marginBottom:   4,
    gap:            4,
  },

  // Matches .skill-name
  skillName: {
    fontFamily:    FONTS.bold,
    fontSize:      12,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.9)",
    letterSpacing: -0.1,
    flex:          1,
  },

  // Matches .skill-prestige-boost
  boostBadge: {
    fontSize:   10,
    fontWeight: "800",
    color:      "#fbbf24",
  },

  // Matches .xp-fraction group
  xpFractionGroup: {
    flexDirection:  "row",
    alignItems:     "baseline",
    flexShrink:     0,
  },
  xpVal: {
    fontFamily:  FONTS.semiBold,
    fontSize:    10,
    fontWeight:  "600",
    color:       "rgba(255,255,255,0.9)",
  },
  xpDim: {
    fontFamily: FONTS.regular,
    fontSize:   10,
    color:      "rgba(255,255,255,0.35)",
  },
  xpLabel: {
    fontFamily:    FONTS.bold,
    fontSize:      10,
    fontWeight:    "800",
    color:         "#22d3ee",
    letterSpacing: 0.6,
  },

  // Matches .skill-track (mobile: 3px height)
  barTrack: {
    height:          3,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius:    20,
    overflow:        "hidden",
    marginTop:       8,
    marginBottom:    6,
  },

  // Matches .skill-fill
  barFill: {
    height:       "100%",
    borderRadius: 20,
  },

  // Matches .skill-percent-readout
  percentReadout: {
    fontFamily:    FONTS.bold,
    fontSize:      10,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.6)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Matches .prestige-trigger-btn
  prestigeBtn: {
    marginTop:         10,
    backgroundColor:   "rgba(255,255,255,0.05)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.18)",
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 10,
    alignItems:        "center",
  },
  prestigeBtnText: {
    fontFamily:    FONTS.black,
    fontSize:      13,
    fontWeight:    "800",
    color:         "#fff",
    letterSpacing: -0.1,
  },
  prestigeBtnSub: {
    fontFamily:    FONTS.regular,
    fontSize:      10,
    color:         "rgba(255,255,255,0.5)",
    marginTop:     3,
    textAlign:     "center",
  },

  // Matches .skill-training-panel
  trainingPanel: {
    marginTop:      8,
    paddingTop:     8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  // Matches .benefit-synced-label
  syncedLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "900",
    letterSpacing: 1.8,
    color:         "#00f5ff",
    marginBottom:  6,
  },

  // Matches .training-benefit
  trainingBenefit: {
    fontFamily:  FONTS.regular,
    fontSize:    11,
    color:       "rgba(255,255,255,0.6)",
    lineHeight:  17,
    marginBottom: 10,
  },

  // Matches .training-missions-label
  trainsLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "900",
    letterSpacing: 1.8,
    color:         "#22d3ee",
    textTransform: "uppercase",
    marginBottom:  6,
  },

  // Matches .training-mission-item
  trainItem: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    marginBottom:  4,
  },
  trainDot: {
    fontSize:  13,
    lineHeight: 16,
  },
  trainText: {
    fontFamily:  FONTS.monoBold,
    fontSize:    10,
    fontWeight:  "700",
    color:       "rgba(255,255,255,0.75)",
  },

  // Matches .skill-info-trigger
  infoTrigger: {
    marginTop:     8,
    fontFamily:    FONTS.monoBold,
    fontSize:      10,
    fontWeight:    "700",
    letterSpacing: 1.2,
    color:         "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    textAlign:     "center",
  },

  empty: {
    color:      COLORS.textMuted,
    fontSize:   14,
    fontFamily: FONTS.regular,
    textAlign:  "center",
    marginTop:  40,
    width:      "100%",
  },
});
