import React, { useState, useRef } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";

export default function ShatterModal({ baseTask, onDeploy, onCancel }) {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  const [steps, setSteps] = useState(["", "", "", ""]);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const allFilled = steps.every(s => s.trim().length > 0);

  const update = (i, val) => {
    const next = [...steps];
    next[i] = val;
    setSteps(next);
  };

  const handleDeploy = () => {
    if (!allFilled) return;
    onDeploy(steps.map((text, id) => ({ id, text: text.trim(), isDone: false })));
  };

  return (
    <Modal transparent animationType="slide" visible={!!baseTask}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Split Session</Text>
          <Text style={styles.subtitle}>
            Break <Text style={[styles.taskName, { color: ac }]}>{baseTask?.taskName}</Text> into 4 × 30-min sessions
          </Text>

          {steps.map((val, i) => (
            <View key={i} style={styles.inputRow}>
              <Text style={[styles.stepNum, { color: ac }]}>{i + 1}</Text>
              <TextInput
                ref={refs[i]}
                style={styles.input}
                placeholder={`Part ${i + 1}…`}
                placeholderTextColor={COLORS.textMuted}
                value={val}
                onChangeText={v => update(i, v)}
                onSubmitEditing={() => {
                  if (i < 3) refs[i + 1].current?.focus();
                  else if (allFilled) handleDeploy();
                }}
                returnKeyType={i < 3 ? "next" : "done"}
                maxLength={120}
              />
            </View>
          ))}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deployBtn, { backgroundColor: ac }, !allFilled && styles.deployDisabled]}
              onPress={handleDeploy}
              disabled={!allFilled}
            >
              <Text style={styles.deployText}>Deploy →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  title:    { color: COLORS.text, fontSize: 18, fontFamily: FONTS.bold },
  subtitle: { color: COLORS.textMuted, fontSize: 13 },
  taskName: { color: COLORS.accent, fontFamily: FONTS.semiBold },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum:  { color: COLORS.accent, fontSize: 13, fontFamily: FONTS.bold, width: 16 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  actions:     { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  cancelText:  { color: COLORS.textMuted, fontSize: 14 },
  deployBtn: {
    flex: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  deployDisabled: { opacity: 0.4 },
  deployText: { color: COLORS.bg, fontSize: 14, fontFamily: FONTS.bold },
});
