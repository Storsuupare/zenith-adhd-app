import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

// Radiating spark burst used by every "big moment" celebration in the app
// (loot drops, session-complete). Takes a `celebration` config
// ({ sparkCount, sparkDistance, burstDuration }) so callers can scale the
// intensity to how big the moment actually is, rather than one fixed effect
// everywhere. transform + opacity only, same GPU-safe rule as everywhere
// else animated in this app — no canvas, no particle library.
//
// `glyph` is optional — plain colored dots by default (used by session-complete's
// level-up/achievement "big moment", where a coin shape wouldn't mean anything),
// or a specific character to fly instead (LootDisplay passes the credits glyph,
// since that celebration is specifically about the credits just earned).
export default function SparkBurst({ color, celebration, glyph }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angles = useRef(
    Array.from({ length: celebration.sparkCount }, (_, i) => (i / celebration.sparkCount) * Math.PI * 2)
  ).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: celebration.burstDuration, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {angles.map((angle, index) => {
        const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * celebration.sparkDistance] });
        const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * celebration.sparkDistance] });
        const opacity     = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
        const scale        = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
        return (
          <Animated.View
            key={index}
            style={[
              glyph ? styles.glyphWrap : styles.spark,
              !glyph && { backgroundColor: color },
              { opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          >
            {glyph && <Text style={[styles.glyph, { color }]}>{glyph}</Text>}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    marginLeft: -3,
  },
  glyphWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 16,
    height: 16,
    marginTop: -8,
    marginLeft: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 14,
    fontWeight: "700",
  },
});
