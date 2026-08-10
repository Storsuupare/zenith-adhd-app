import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { WHATS_NEW } from "../constants/whatsNew";

export default function WhatsNewModal({ visible, onClose }) {
  const { accentColor } = useTheme() || {};
  const activeAccentColor = accentColor || COLORS.accent;

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[styles.icon, { color: activeAccentColor }]}>{WHATS_NEW.icon}</Text>
          <Text style={styles.title}>{WHATS_NEW.title}</Text>
          <Text style={styles.body}>{WHATS_NEW.body}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: activeAccentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Nice!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         24,
  },
  card: {
    width:           "100%",
    maxWidth:        360,
    backgroundColor: COLORS.surface,
    borderWidth:     1,
    borderColor:     COLORS.border,
    borderRadius:    18,
    padding:         28,
    alignItems:      "center",
    gap:             12,
  },
  icon:  { fontSize: 36 },
  title: { color: COLORS.text, fontSize: 20, fontFamily: FONTS.bold, textAlign: "center" },
  body:  { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, textAlign: "center" },
  button: {
    borderRadius:      10,
    paddingVertical:   14,
    paddingHorizontal: 32,
    marginTop:         8,
  },
  buttonText: {
    color:         "#030712",
    fontSize:      14,
    fontFamily:    FONTS.black,
    fontWeight:    "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
