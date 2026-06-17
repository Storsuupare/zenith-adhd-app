import React, { useEffect, useRef } from "react";
import { View, Image, Text, Animated, StyleSheet } from "react-native";
import { FONTS } from "../constants/fonts";

export default function LoadingScreen() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <Image source={require("../../assets/logo2.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.wordmark}>ZENITH</Text>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#03060b",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  logo: {
    width: 72,
    height: 72,
  },
  wordmark: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 22,
    fontFamily: FONTS.bold,
    letterSpacing: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginTop: 8,
  },
});
