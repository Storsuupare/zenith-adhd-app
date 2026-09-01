import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

// Radiating spark burst used by every "big moment" celebration in the app
// (loot drops, session-complete). Takes a `celebration` config
// ({ sparkCount, sparkDistance, burstDuration }) so callers can scale the
// intensity to how big the moment actually is, rather than one fixed effect
// everywhere. transform + opacity only, same GPU-safe rule as everywhere
// else animated in this app — no canvas, no particle library.
export default function SparkBurst({ color, celebration }) {
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
              styles.spark,
              {
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
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
});
