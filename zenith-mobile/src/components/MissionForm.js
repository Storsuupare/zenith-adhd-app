import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SKILL_CATEGORIES, DURATIONS, SKILL_INFO } from "../constants/skills";

const LAST_SKILL_KEY    = "zenith_last_skill";
const LAST_DURATION_KEY = "zenith_last_duration";
const DEFAULT_SKILL     = "Resolve";
const DEFAULT_DURATION  = 30;

export default function MissionForm({ onStart, accentColor = "#22d3ee" }) {
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [skill,    setSkill]    = useState(DEFAULT_SKILL);
  const [openCategory, setOpenCategory] = useState(null);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([LAST_SKILL_KEY, LAST_DURATION_KEY])
      .then(([[, lastSkill], [, lastDuration]]) => {
        if (lastSkill) setSkill(lastSkill);
        if (lastDuration) setDuration(Number(lastDuration));
      })
      .catch(() => {});
  }, []);

  const canStart = taskName.trim().length > 0;

  const handleStart = async () => {
    if (!canStart || busy) return;
    setBusy(true);
    try {
      await onStart({ taskName: taskName.trim(), durationMinutes: duration, skillName: skill });
      AsyncStorage.multiSet([[LAST_SKILL_KEY, skill], [LAST_DURATION_KEY, String(duration)]]).catch(() => {});
      setTaskName(""); setOpenCategory(null);
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

      <Text style={[styles.sectionLabel, { color: accentColor, borderBottomColor: accentColor + "38" }]}>CHOOSE SKILL</Text>
      <View style={styles.skillGrid}>
        {SKILL_CATEGORIES.map(category => {
          const isExpanded      = openCategory === category.name;
          const holdsSelection  = category.skills.includes(skill);
          const highlightColor  = holdsSelection ? SKILL_COLORS[skill.toUpperCase()] : accentColor;
          const isHighlighted   = isExpanded || holdsSelection;
          return (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.chip,
                isHighlighted
                  ? { borderColor: highlightColor, backgroundColor: "rgba(255,255,255,0.14)" }
                  : { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
              ]}
              onPress={() => setOpenCategory(isExpanded ? null : category.name)}
            >
              <Text style={[
                styles.chipText,
                { color: isHighlighted ? highlightColor : "rgba(255,255,255,0.45)" },
              ]}>
                {holdsSelection ? skill.toUpperCase() : category.name.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {openCategory && (
        <View style={styles.skillGrid}>
          {SKILL_CATEGORIES.find(category => category.name === openCategory).skills.map(skillName => {
            const skillColor = SKILL_COLORS[skillName.toUpperCase()];
            const active     = skill === skillName;
            return (
              <TouchableOpacity
                key={skillName}
                style={[
                  styles.subChip,
                  active
                    ? { borderColor: skillColor, backgroundColor: "rgba(255,255,255,0.14)" }
                    : { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
                ]}
                onPress={() => { setSkill(skillName); setOpenCategory(null); }}
              >
                <Text style={[styles.chipText, { color: active ? skillColor : "rgba(255,255,255,0.6)" }]}>
                  {skillName.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Example tasks for selected skill */}
      {skill && (
        <Text style={styles.skillHint}>e.g. {SKILL_INFO[skill]}</Text>
      )}

      {/* Duration buttons */}
      <Text style={[styles.sectionLabel, { color: accentColor, borderBottomColor: accentColor + "38" }]}>DURATION</Text>
      <View style={styles.durGrid}>
        {[DURATIONS.slice(0, 3), DURATIONS.slice(3)].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.durRow}>
            {row.map(dur => {
              const isActive    = duration === dur.mins;
              const buttonColor = skill ? SKILL_COLORS[skill.toUpperCase()] : accentColor;
              return (
                <TouchableOpacity
                  key={dur.mins}
                  style={[
                    styles.durBtn,
                    isActive && { borderColor: buttonColor, backgroundColor: buttonColor + "1a" },
                  ]}
                  onPress={() => setDuration(dur.mins)}
                >
                  <Text style={[styles.durLabel, isActive && { color: buttonColor }]}>{dur.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          canStart
            ? { backgroundColor: accentColor, borderColor: accentColor }
            : { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.04)" },
        ]}
        onPress={handleStart}
        disabled={!canStart || busy}
        activeOpacity={0.8}
      >
        {busy
          ? <ActivityIndicator color={canStart ? "#030712" : accentColor} />
          : <Text style={[styles.startText, { color: canStart ? "#030712" : "rgba(255,255,255,0.55)" }]}>
              {canStart ? `Begin ${duration} Min Session →` : "Name your task to begin"}
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
  subChip: {
    flex:              1,
    paddingHorizontal: 12,
    paddingVertical:   9,
    borderRadius:      12,
    borderWidth:       1,
    alignItems:        "center",
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
    gap: 8,
  },
  durRow: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            8,
  },
  durBtn: {
    flex:            1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
    borderRadius:    8,
    paddingVertical: 10,
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
