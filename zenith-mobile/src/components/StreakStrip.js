import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../constants/fonts";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function isToday(dateString) {
  return dateString === new Date().toISOString().slice(0, 10);
}

export default function StreakStrip({ last7Days = [] }) {
  const { accentColor } = useTheme();

  if (last7Days.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>LAST 7 DAYS</Text>
      <View style={styles.row}>
        {last7Days.map(dayEntry => {
          const dayLetter = DAY_LETTERS[new Date(dayEntry.day).getDay()];
          const today     = isToday(dayEntry.day);
          return (
            <View key={dayEntry.day} style={styles.dayColumn}>
              <View
                style={[
                  styles.dot,
                  dayEntry.completed
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : styles.dotMissed,
                  today && styles.dotToday,
                ]}
              />
              <Text style={[styles.dayLabel, today && { color: accentColor }]}>
                {dayLetter}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.07)",
    borderRadius:    12,
    padding:         14,
    gap:             10,
  },
  eyebrow: {
    color:         "rgba(255,255,255,0.3)",
    fontSize:      9,
    fontFamily:    FONTS.bold,
    letterSpacing: 2.5,
  },
  row: {
    flexDirection:  "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    gap:        6,
  },
  dot: {
    width:        16,
    height:       16,
    borderRadius: 8,
    borderWidth:  1.5,
    borderColor:  "rgba(255,255,255,0.15)",
  },
  dotMissed: {
    backgroundColor: "transparent",
  },
  dotToday: {
    borderColor: "#f8fafc",
  },
  dayLabel: {
    color:      "rgba(255,255,255,0.35)",
    fontSize:   10,
    fontFamily: FONTS.semiBold,
  },
});
