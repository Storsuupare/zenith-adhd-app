import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SPACING, SURFACE } from "../constants/layout";

export default function ScreenHeader({ title, subtitle, onBack, children }) {
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={10}>
          <Text style={styles.backLabel}>‹</Text>
        </TouchableOpacity>
      )}
      <View style={styles.titleGroup}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               12,
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical:   12,
    backgroundColor:   SURFACE.header,
    borderBottomWidth: 1,
    borderBottomColor: SURFACE.divider,
  },
  backButton: {
    width:      22,
    marginLeft: -4,
  },
  backLabel: {
    color:      COLORS.text,
    fontSize:   28,
    lineHeight: 30,
    fontFamily: FONTS.regular,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    color:      COLORS.text,
    fontSize:   20,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    color:      COLORS.textMuted,
    fontSize:   12,
    fontFamily: FONTS.regular,
    marginTop:  1,
  },
});
