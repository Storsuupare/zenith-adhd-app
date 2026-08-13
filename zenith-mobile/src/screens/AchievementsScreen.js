import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { fetchAchievements } from "../services/api";

// Matches the rarity colours used for loot elsewhere in the app.
const RARITY_COLORS = {
  Uncommon:  "#4ade80",
  Rare:      "#60a5fa",
  Epic:      "#a855f7",
  Legendary: "#fbbf24",
  Mythic:    "#f472b6",
};

const STARS_BY_RARITY = {
  Uncommon:  2,
  Rare:      3,
  Epic:      4,
  Legendary: 5,
  Mythic:    6,
};

export default function AchievementsScreen() {
  const { accentColor } = useTheme() || {};
  const { clearAchievementsUnseen } = useUser() || {};
  const activeAccentColor = accentColor || COLORS.accent;

  const [achievements, setAchievements] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAchievements = useCallback(async () => {
    try {
      const response = await fetchAchievements();
      setAchievements(response.data.achievements ?? []);
      setUnlockedCount(response.data.unlocked_count ?? 0);
      setTotalCount(response.data.total_count ?? 0);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAchievements(); }, [loadAchievements]);

  // Opening the screen is what counts as "seen" — clears the tab dot.
  useEffect(() => { clearAchievementsUnseen?.(); }, [clearAchievementsUnseen]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievements();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator color={activeAccentColor} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  // A dedicated error state rather than an inline message: with one line of text
  // the list has nothing to scroll, so it never bounces and pull-to-refresh can't
  // be triggered — leaving no way to retry at all.
  if (loadError) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Achievements</Text>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>☆</Text>
          <Text style={styles.errorText}>Couldn't load achievements</Text>
          <Text style={styles.errorSub}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: activeAccentColor + "55" }]}
            onPress={() => { setLoading(true); loadAchievements(); }}
          >
            <Text style={[styles.retryTxt, { color: activeAccentColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Preserves the order the server sends, so reordering the list is a backend-only change.
  const categories = achievements.reduce((grouped, achievement) => {
    (grouped[achievement.category] ||= []).push(achievement);
    return grouped;
  }, {});

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={[styles.counter, { color: activeAccentColor }]}>
          {unlockedCount} / {totalCount}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Without this the list won't bounce when the content is shorter than the
        // screen, and RefreshControl can only fire on a bounce.
        alwaysBounceVertical
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeAccentColor} />
        }
      >
        {Object.entries(categories).map(([category, entries]) => (
          <View key={category} style={styles.categoryBlock}>
            <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>

            {entries.map(achievement => {
              const unlocked    = Boolean(achievement.unlocked_at);
              const rarityColor = RARITY_COLORS[achievement.lootRarity] ?? activeAccentColor;

              return (
                <View
                  key={achievement.key}
                  style={[
                    styles.card,
                    unlocked
                      ? { borderColor: rarityColor + "55", backgroundColor: "rgba(255,255,255,0.05)" }
                      : styles.cardLocked,
                  ]}
                >
                  <View style={styles.starColumn}>
                    <Text
                      style={[styles.stars, { color: unlocked ? rarityColor : "rgba(255,255,255,0.22)" }]}
                      numberOfLines={2}
                    >
                      {(unlocked ? "★" : "☆").repeat(STARS_BY_RARITY[achievement.lootRarity] ?? 1)}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, !unlocked && styles.textLocked]}>
                      {achievement.title}
                    </Text>
                    <Text style={[styles.cardDesc, !unlocked && styles.textLocked]}>
                      {achievement.description}
                    </Text>
                  </View>

                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title:   { color: "#f8fafc", fontSize: 14, fontFamily: FONTS.bold, letterSpacing: 2 },
  counter: { fontSize: 13, fontFamily: FONTS.semiBold },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 18 },

  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  errorIcon:  { fontSize: 32, color: "rgba(255,255,255,0.2)", marginBottom: 4 },
  errorText:  { color: "#f8fafc", fontSize: 16, fontFamily: FONTS.bold },
  errorSub:   { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },
  retryBtn:   { marginTop: 12, borderWidth: 1, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt:   { fontSize: 14, fontFamily: FONTS.semiBold },

  categoryBlock: { gap: 8 },
  categoryLabel: {
    color: "rgba(255,255,255,0.45)", fontSize: 11,
    fontFamily: FONTS.monoBold, letterSpacing: 2.5, marginBottom: 2,
  },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  cardLocked: { borderColor: "rgba(255,255,255,0.07)" },

  starColumn: { width: 54 },
  stars: { fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },

  cardBody:  { flex: 1 },
  cardTitle: { color: "#f8fafc", fontSize: 14, fontFamily: FONTS.semiBold },
  cardDesc:  { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2, lineHeight: 17 },
  textLocked: { color: "rgba(255,255,255,0.35)" },

});
