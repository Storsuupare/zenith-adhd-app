import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { SKILLS, DURATIONS } from "../constants/skills";
import { FONTS } from "../constants/fonts";

export default function FirstSessionScreen({ onStart, onSkip }) {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(30);
  const [skill,    setSkill]    = useState(null);
  const [busy,     setBusy]     = useState(false);

  const canStart = taskName.trim().length > 0 && skill !== null;

  const handleStart = async () => {
    if (!canStart || busy) return;
    setBusy(true);
    try {
      await onStart({ taskName: taskName.trim(), durationMinutes: duration, skillName: skill });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.brand, { color: ac }]}>⬡ Zenith</Text>
        <Text style={styles.headline}>What are you working on?</Text>
        <Text style={styles.sub}>Name it. Pick a duration. Start.</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Study for exam, Finish the report…"
          placeholderTextColor={COLORS.textMuted}
          value={taskName}
          onChangeText={setTaskName}
          autoFocus
          maxLength={120}
          autoCorrect={false}
        />

        <Text style={styles.label}>Choose a skill</Text>
        <View style={styles.skillGrid}>
          {SKILLS.map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.chip,
                { borderColor: SKILL_COLORS[s.toUpperCase()] + "66" },
                skill === s && { backgroundColor: SKILL_COLORS[s.toUpperCase()] + "33", borderColor: SKILL_COLORS[s.toUpperCase()] },
              ]}
              onPress={() => setSkill(s)}
            >
              <Text style={[styles.chipText, skill === s && { color: SKILL_COLORS[s.toUpperCase()] }]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Duration</Text>
        <View style={styles.durRow}>
          {DURATIONS.map(d => (
            <TouchableOpacity
              key={d.mins}
              style={[styles.durBtn, duration === d.mins && { backgroundColor: ac + "22", borderColor: ac }]}
              onPress={() => setDuration(d.mins)}
            >
              <Text style={[styles.durText, duration === d.mins && { color: ac }]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: ac }, (!canStart || busy) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!canStart || busy}
        >
          {busy
            ? <ActivityIndicator color={COLORS.bg} />
            : <Text style={styles.startText}>Start Session →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: 24, gap: 14 },
  brand:   { color: COLORS.accent, fontSize: 22, fontFamily: FONTS.bold, letterSpacing: 2 },
  headline:{ color: COLORS.text, fontSize: 26, fontFamily: FONTS.bold },
  sub:     { color: COLORS.textMuted, fontSize: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  label: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: COLORS.textMuted, fontSize: 13 },
  durRow:   { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  durBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  durBtnActive: { backgroundColor: COLORS.accent + "22", borderColor: COLORS.accent },
  durText:      { color: COLORS.textMuted, fontSize: 13 },
  durTextActive:{ color: COLORS.accent, fontFamily: FONTS.semiBold },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  startBtnDisabled: { opacity: 0.4 },
  startText: { color: COLORS.bg, fontFamily: FONTS.bold, fontSize: 16 },
  skipBtn: { alignItems: "center", padding: 8 },
  skipText: { color: COLORS.textMuted, fontSize: 13 },
});
