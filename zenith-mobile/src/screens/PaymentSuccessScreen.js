import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";

const STEPS = [
  "Verifying signature",
  "Syncing tier",
  "Unlocking features",
  "Calibrating audio",
  "System optimized",
];

export default function PaymentSuccessScreen({ navigation }) {
  const { accentColor } = useTheme() || {};
  const activeAccentColor = accentColor || COLORS.accent;
  const [current, setCurrent] = useState(0);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    if (current < STEPS.length - 1) {
      const timer = setTimeout(() => setCurrent(count => count + 1), 550);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setDone(true), 800);
      return () => clearTimeout(timer);
    }
  }, [current]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        {!done ? (
          <>
            <Text style={styles.eyebrow}>PROCESSING</Text>
            {STEPS.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={[
                  styles.stepDot,
                  index < current   && { color: COLORS.green },
                  index === current && { color: activeAccentColor },
                ]}>
                  {index < current ? "✓" : index === current ? "▶" : "·"}
                </Text>
                <Text style={[
                  styles.stepText,
                  index === current && { color: COLORS.text },
                  index < current   && { color: COLORS.textMuted },
                ]}>
                  {step}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.successCard}>
            <Text style={[styles.successIcon, { color: activeAccentColor }]}>◆</Text>
            <Text style={styles.successTitle}>Upgrade complete.</Text>
            <Text style={styles.successBody}>Your new tier is active. All features are unlocked.</Text>
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: activeAccentColor }]}
              onPress={() => navigation.replace("Home")}
            >
              <Text style={styles.continueText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.bg },
  content:      { flex: 1, justifyContent: "center", padding: 32, gap: 14 },
  eyebrow:      { color: COLORS.textMuted, fontSize: 11, letterSpacing: 3, fontWeight: "700", marginBottom: 8 },
  stepRow:      { flexDirection: "row", alignItems: "center", gap: 12 },
  stepDot:      { color: COLORS.border, fontSize: 14, width: 20, fontWeight: "700" },
  stepText:     { color: COLORS.border, fontSize: 14 },
  successCard:  { alignItems: "center", gap: 14 },
  successIcon:  { color: COLORS.accent, fontSize: 40 },
  successTitle: { color: COLORS.text, fontSize: 22, fontWeight: "700" },
  successBody:  { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  continueBtn:  {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  continueText: { color: COLORS.bg, fontWeight: "700", fontSize: 16 },
});
