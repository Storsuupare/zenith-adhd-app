import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";


export default function GlassCard({
  style,
  children,
  intensity = 50,
  tintColor = "rgba(5,8,15,0.55)",
}) {
  return (
    <View style={[style, styles.overflow]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tintColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overflow: { overflow: "hidden" },
});
