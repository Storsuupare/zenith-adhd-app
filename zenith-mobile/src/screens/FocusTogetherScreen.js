import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS, SKILL_COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { SKILL_ICONS } from "../constants/skills";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import { fetchFriendsPresence } from "../services/api";

const POLL_INTERVAL_MS = 10000;

function formatElapsed(startedAt) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 1) return "just started";
  return `${minutes}m in`;
}

export default function FocusTogetherScreen({ navigation }) {
  const { user } = useUser() || {};
  const { accentColor } = useTheme() || {};
  const activeAccentColor = accentColor || COLORS.accent;
  const isProPlus = (user?.account_tier ?? 0) >= 1;

  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchFriendsPresence()
      .then(response => setSessions(response.data?.sessions ?? []))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));

    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader
        title="Focus Together"
        subtitle={loading ? "Loading…" : `${sessions.length} of your friends focusing`}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator color={activeAccentColor} style={styles.spinner} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeAccentColor} />}
        >
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No friends focusing right now</Text>
              <Text style={styles.emptyDetail}>Check back in a bit, or start a session yourself.</Text>
            </View>
          ) : (
            <View style={styles.section}>
              {sessions.map((session, index) => {
                const displayName = (session.skillName || "").toUpperCase();
                const skillColor  = SKILL_COLORS[displayName] || activeAccentColor;
                const skillIcon   = SKILL_ICONS[displayName] || "ellipse-outline";
                return (
                  <View key={session.username ?? index} style={[styles.row, index > 0 && styles.rowDivided]}>
                    {isProPlus && <Ionicons name={skillIcon} size={16} color={skillColor} style={styles.rowIcon} />}
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>
                        {session.username} is focusing{isProPlus ? ` on ${session.skillName}` : ""}
                      </Text>
                      {isProPlus && <Text style={styles.rowElapsed}>{formatElapsed(session.startedAt)}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!isProPlus && sessions.length > 0 && (
            <Text style={styles.upgradeHint}>PRO unlocks seeing what skill and how long.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: SPACING.screenPadding, paddingBottom: 40 },
  spinner: { marginTop: 40 },

  section: {
    backgroundColor: SURFACE.card,
    borderWidth:     1,
    borderColor:     SURFACE.cardBorder,
    borderRadius:    RADIUS.medium,
    overflow:        "hidden",
  },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: SURFACE.inset },
  rowIcon:    { width: 18, textAlign: "center" },
  rowBody:    { flex: 1, gap: 2 },
  rowName:    { color: COLORS.text, fontSize: 13, fontFamily: FONTS.semiBold },
  rowElapsed: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  upgradeHint: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   11,
    fontFamily: FONTS.regular,
    marginTop:  10,
    textAlign:  "center",
  },

  emptyState:  { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  emptyDetail: {
    color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular,
    textAlign: "center", paddingHorizontal: 24,
  },
});
