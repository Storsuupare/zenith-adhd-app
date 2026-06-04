import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";

const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || "https://zenithapp.org";

export default function PaymentCancelScreen({ navigation }) {
  const { accentColor } = useTheme() || {};
  const ac = accentColor || COLORS.accent;
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.icon}>◌</Text>
        <Text style={styles.title}>Payment cancelled.</Text>
        <Text style={styles.body}>No charge was made. You can try again whenever you're ready.</Text>

        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: ac }]}
          onPress={() => Linking.openURL(WEBSITE_URL)}
        >
          <Text style={styles.retryText}>Try again ↗</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.replace("Home")}
        >
          <Text style={styles.backText}>Back to app</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 14 },
  icon:    { color: COLORS.textMuted, fontSize: 40 },
  title:   { color: COLORS.text, fontSize: 22, fontWeight: "700" },
  body:    { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  retryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  retryText: { color: COLORS.bg, fontWeight: "700", fontSize: 15 },
  backBtn:   { padding: 12 },
  backText:  { color: COLORS.textMuted, fontSize: 14 },
});
