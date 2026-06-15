import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SKILLS, DURATIONS, SKILL_INFO } from "../constants/skills";

export default function MissionForm({ onStart, accentColor = "#22d3ee" }) {
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(null);
  const [skill,    setSkill]    = useState(null);
  const [busy,     setBusy]     = useState(false);

  const canStart = taskName.trim().length > 0 && skill !== null && duration !== null;

  const handleStart = async () => {
    if (!canStart || busy) return;
    setBusy(true);
    try {
      await onStart({ taskName: taskName.trim(), durationMinutes: duration, skillName: skill });
      setTaskName(""); setSkill(null); setDuration(null);
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.container}>

      {/* Task name input */}
      <TextInput
        style={[styles.input, { borderColor: skill ? SKILL_COLORS[skill.toUpperCase()] + "55" : "rgba(255,255,255,0.1)" }]}
        placeholder="What are you working on?"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={taskName}
        onChangeText={setTaskName}
        maxLength={120}
        autoCorrect={false}
        returnKeyType="done"
      />

      {/* Skill picker — all chips visible, no scroll */}
      <Text style={[styles.sectionLabel, { color: accentColor, borderBottomColor: accentColor + "38" }]}>CHOOSE SKILL</Text>
      <View style={styles.skillGrid}>
        {SKILLS.map(skillName => {
          const skillColor = SKILL_COLORS[skillName.toUpperCase()];
          const active     = skill === skillName;
          return (
            <TouchableOpacity
              key={skillName}
              style={[
                styles.chip,
                active
                  ? { borderColor: skillColor, backgroundColor: "rgba(255,255,255,0.14)" }
                  : { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
              ]}
              onPress={() => setSkill(skillName)}
            >
              <Text style={[styles.chipText, { color: active ? skillColor : "rgba(255,255,255,0.45)" }]}>
                {skillName.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Example tasks for selected skill */}
      {skill && (
        <Text style={styles.skillHint}>e.g. {SKILL_INFO[skill]}</Text>
      )}

      {/* Duration buttons */}
      <Text style={[styles.sectionLabel, { color: accentColor, borderBottomColor: accentColor + "38" }]}>DURATION</Text>
      <View style={styles.durGrid}>
        {DURATIONS.map(d => {
          const active = duration === d.mins;
          const ac     = skill ? SKILL_COLORS[skill.toUpperCase()] : accentColor;
          return (
            <TouchableOpacity
              key={d.mins}
              style={[
                styles.durBtn,
                active && { borderColor: ac, backgroundColor: ac + "1a" },
              ]}
              onPress={() => setDuration(d.mins)}
            >
              <Text style={[styles.durLabel, active && { color: ac }]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          canStart
            ? { backgroundColor: accentColor, borderColor: accentColor }
            : { borderColor: "rgba(255,255,255,0.12)", opacity: 0.4 },
        ]}
        onPress={handleStart}
        disabled={!canStart || busy}
        activeOpacity={0.8}
      >
        {busy
          ? <ActivityIndicator color={canStart ? "#030712" : accentColor} />
          : <Text style={[styles.startText, { color: canStart ? "#030712" : "rgba(255,255,255,0.4)" }]}>
              Begin Session →
            </Text>
        }
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    borderRadius:    18,
    padding:         20,
    gap:             12,
  },

  input: {
    backgroundColor:   "rgba(0,0,0,0.3)",
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 16,
    paddingVertical:   14,
    color:             "#fff",
    fontSize:          14,
    fontFamily:        FONTS.semiBold,
  },

  sectionLabel: {
    fontFamily:     FONTS.monoBold,
    fontSize:       11,
    fontWeight:     "900",
    letterSpacing:  3,
    textTransform:  "uppercase",
    textAlign:      "center",
    paddingBottom:  6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(34,211,238,0.22)",
  },

  skillGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      20,
    borderWidth:       1,
  },
  chipText: {
    fontFamily:    FONTS.bold,
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  skillHint: {
    color:             "rgba(255,255,255,0.4)",
    fontSize:          11,
    fontFamily:        FONTS.regular,
    fontStyle:         "italic",
    textAlign:         "center",
    paddingHorizontal: 4,
  },

  durGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
  },
  durBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    8,
    paddingVertical:   10,
    paddingHorizontal: 14,
    alignItems:      "center",
  },
  durLabel: {
    fontFamily:    FONTS.monoBold,
    fontSize:      12,
    fontWeight:    "700",
    letterSpacing: 1,
    color:         "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
  },

  startBtn: {
    backgroundColor:   "rgba(255,255,255,0.12)",
    borderWidth:       1,
    borderRadius:      10,
    paddingVertical:   16,
    alignItems:        "center",
    marginTop:         2,
  },
  startText: {
    fontFamily:    FONTS.black,
    fontSize:      14,
    fontWeight:    "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
