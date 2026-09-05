import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import { fetchAchievements } from "../services/api";

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

function formatUnlockDate(timestamp) {
  const unlockDate = new Date(timestamp);
  if (Number.isNaN(unlockDate.getTime())) return null;
  return unlockDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function AchievementCard({ achievement, accentColor }) {
  const isUnlocked  = Boolean(achievement.unlocked_at);
  const rarityColor = RARITY_COLORS[achievement.lootRarity] ?? accentColor;
  const starCount   = Math.min(STARS_BY_RARITY[achievement.lootRarity] ?? 1, 5);

  const threshold      = Number(achievement.threshold ?? 0);
  const progress       = Number(achievement.progress ?? 0);
  const hasProgressBar = !isUnlocked && threshold > 1 && progress > 0;
  const progressPercent = threshold > 0 ? Math.min((progress / threshold) * 100, 100) : 0;
  const unlockDate     = isUnlocked ? formatUnlockDate(achievement.unlocked_at) : null;

  return (
    <View style={[
      styles.card,
      isUnlocked
        ? { borderColor: rarityColor + "55", backgroundColor: "rgba(255,255,255,0.05)" }
        : styles.cardLocked,
    ]}>
      <View style={styles.starColumn}>
        <Text
          style={[styles.stars, { color: isUnlocked ? rarityColor : "rgba(255,255,255,0.22)" }]}
          numberOfLines={1}
        >
          {(isUnlocked ? "★" : "☆").repeat(starCount)}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, !isUnlocked && styles.textLocked]}>
          {achievement.title}
        </Text>
        <Text style={[styles.cardDescription, !isUnlocked && styles.textLocked]}>
          {achievement.description}
        </Text>

        {hasProgressBar && (
          <View style={styles.progressGroup}>
            <View style={styles.progressTrack}>
              <View style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: rarityColor },
              ]} />
            </View>
            <Text style={styles.progressLabel}>
              {progress.toLocaleString()} / {threshold.toLocaleString()}
            </Text>
          </View>
        )}

        {unlockDate && <Text style={styles.unlockDate}>Unlocked {unlockDate}</Text>}
      </View>
    </View>
  );
}

export default function AchievementsScreen({ navigation }) {
  const { accentColor } = useTheme() || {};
  const { clearAchievementsUnseen } = useUser() || {};
  const activeAccentColor = accentColor || COLORS.accent;

  const [achievements,  setAchievements]  = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount,    setTotalCount]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [loadError,     setLoadError]     = useState(false);

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

  useEffect(() => { clearAchievementsUnseen?.(); }, [clearAchievementsUnseen]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievements();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Awards" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={activeAccentColor} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Awards" onBack={() => navigation.goBack()} />
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>☆</Text>
          <Text style={styles.errorTitle}>Couldn't load awards</Text>
          <Text style={styles.errorDetail}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: activeAccentColor + "55" }]}
            onPress={() => { setLoading(true); loadAchievements(); }}
          >
            <Text style={[styles.retryButtonText, { color: activeAccentColor }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categories = achievements.reduce((grouped, achievement) => {
    (grouped[achievement.category] ||= []).push(achievement);
    return grouped;
  }, {});

  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Awards" subtitle={`${unlockedCount} of ${totalCount} earned`} onBack={() => navigation.goBack()}>
        <Text style={[styles.completionValue, { color: activeAccentColor }]}>{completionPercent}%</Text>
      </ScreenHeader>

      <View style={styles.completionTrack}>
        <View style={[
          styles.completionFill,
          { width: `${completionPercent}%`, backgroundColor: activeAccentColor },
        ]} />
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
        {Object.entries(categories).map(([category, entries]) => {
          const sortedEntries = [...entries].sort((first, second) => {
            const firstRank  = first.unlocked_at  ? 0 : 1;
            const secondRank = second.unlocked_at ? 0 : 1;
            return firstRank - secondRank;
          });
          const earnedInCategory = entries.filter(entry => entry.unlocked_at).length;

          return (
            <View key={category} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
                <Text style={styles.categoryCount}>{earnedInCategory}/{entries.length}</Text>
              </View>

              {sortedEntries.map(achievement => (
                <AchievementCard
                  key={achievement.key}
                  achievement={achievement}
                  accentColor={activeAccentColor}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },

  completionValue: { fontSize: 18, fontFamily: FONTS.bold },
  completionTrack: {
    height:          3,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow:        "hidden",
  },
  completionFill: { height: "100%" },

  scroll:  { flex: 1 },
  content: { padding: SPACING.screenPadding, paddingBottom: 40, gap: 20 },

  errorState:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  errorIcon:       { fontSize: 32, color: "rgba(255,255,255,0.2)", marginBottom: 4 },
  errorTitle:      { color: COLORS.text, fontSize: 16, fontFamily: FONTS.bold },
  errorDetail:     { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.regular, textAlign: "center" },
  retryButton:     { marginTop: 12, borderWidth: 1, borderRadius: RADIUS.small, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { fontSize: 14, fontFamily: FONTS.semiBold },

  categoryBlock:  { gap: 8 },
  categoryHeader: {
    flexDirection:  "row",
    alignItems:     "baseline",
    justifyContent: "space-between",
    marginBottom:   2,
  },
  categoryLabel: {
    color:         "rgba(255,255,255,0.45)",
    fontSize:      11,
    fontFamily:    FONTS.monoBold,
    letterSpacing: 2.5,
  },
  categoryCount: {
    color:      "rgba(255,255,255,0.28)",
    fontSize:   11,
    fontFamily: FONTS.monoBold,
  },

  card: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             12,
    borderWidth:     1,
    borderRadius:    RADIUS.medium,
    padding:         12,
    backgroundColor: SURFACE.card,
  },
  cardLocked: { borderColor: "rgba(255,255,255,0.07)" },

  starColumn: { width: 54 },
  stars:      { fontSize: 11, lineHeight: 14, letterSpacing: 0.5 },

  cardBody:        { flex: 1 },
  cardTitle:       { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  cardDescription: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2, lineHeight: 17 },
  textLocked:      { color: "rgba(255,255,255,0.35)" },

  progressGroup: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    marginTop:     8,
  },
  progressTrack: {
    flex:            1,
    height:          3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    2,
    overflow:        "hidden",
  },
  progressFill:  { height: "100%", borderRadius: 2 },
  progressLabel: {
    color:      "rgba(255,255,255,0.4)",
    fontSize:   10,
    fontFamily: FONTS.monoBold,
    flexShrink: 0,
  },

  unlockDate: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   10,
    fontFamily: FONTS.regular,
    marginTop:  6,
  },
});
