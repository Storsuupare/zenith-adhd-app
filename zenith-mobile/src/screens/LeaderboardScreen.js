import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, SafeAreaView, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import { setUsername as setUsernameApi, fetchWeeklyLeaderboard } from "../services/api";

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function UsernameGate({ onSet }) {
  const { accentColor } = useTheme() || {};
  const [value, setValue]     = useState("");
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      await setUsernameApi(value.trim());
      onSet(value.trim());
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === "USERNAME_TAKEN") setError("That username is taken.");
      else if (code === "USERNAME_RESERVED") setError("That username isn't available.");
      else if (code === "INVALID_USERNAME_FORMAT") setError("3-20 characters, letters/numbers/underscore only.");
      else setError("Couldn't save that username — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>Choose a username</Text>
      <Text style={styles.gateDetail}>
        This is what friends see on the leaderboard — not your email or real name.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Your Username"
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={value}
        onChangeText={setValue}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={20}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {error && <Text style={styles.gateError}>{error}</Text>}
      <TouchableOpacity
        style={[styles.gateButton, { backgroundColor: accentColor }, saving && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={saving || value.trim().length < 3}
        accessibilityRole="button"
        accessibilityLabel="Save username"
      >
        {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.gateButtonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function LeaderboardScreen({ navigation }) {
  const { user, fetchUser } = useUser() || {};
  const { accentColor } = useTheme() || {};
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(() => {
    return fetchWeeklyLeaderboard()
      .then(response => setRows(response.data ?? []))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    if (user?.has_set_username) {
      loadLeaderboard().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.has_set_username, loadLeaderboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const handleUsernameSet = async () => {
    await fetchUser?.();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Leaderboard" subtitle="This week" onBack={() => navigation.goBack()}>
        {user?.has_set_username && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Friends")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Manage friends"
          >
            <Ionicons name="people-outline" size={22} color={accentColor || COLORS.accent} />
          </TouchableOpacity>
        )}
      </ScreenHeader>

      {loading ? (
        <ActivityIndicator color={accentColor} style={styles.spinner} />
      ) : !user?.has_set_username ? (
        <UsernameGate onSet={handleUsernameSet} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        >
          {rows.length <= 1 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No friends on the board yet</Text>
              <Text style={styles.emptyDetail}>Add friends to see how you stack up this week.</Text>
              <TouchableOpacity
                style={[styles.addFriendsButton, { borderColor: accentColor }]}
                onPress={() => navigation.navigate("Friends")}
                accessibilityRole="button"
                accessibilityLabel="Add friends"
              >
                <Text style={[styles.addFriendsButtonText, { color: accentColor }]}>Add friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              {rows.map((row, index) => (
                <View
                  key={row.id}
                  style={[
                    styles.row,
                    index > 0 && styles.rowDivided,
                    row.is_self && { backgroundColor: accentColor + "14" },
                  ]}
                >
                  <Text style={styles.rank}>{index + 1}</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>{row.username}{row.is_self ? " (you)" : ""}</Text>
                    <Text style={styles.rowLevel}>Lv {row.level}</Text>
                  </View>
                  <Text style={[styles.rowMinutes, { color: accentColor }]}>
                    {formatMinutes(row.weekly_minutes)}
                  </Text>
                </View>
              ))}
            </View>
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
    gap:               12,
    paddingHorizontal: 14,
    paddingVertical:   13,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: SURFACE.inset },
  rank: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.monoBold, width: 20 },
  rowBody:  { flex: 1, gap: 2 },
  rowName:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  rowLevel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },
  rowMinutes: { fontSize: 13, fontFamily: FONTS.monoBold },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  emptyDetail: {
    color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular,
    textAlign: "center", paddingHorizontal: 24, marginBottom: 8,
  },
  addFriendsButton: {
    borderWidth: 1, borderRadius: RADIUS.small,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 8,
  },
  addFriendsButtonText: { fontSize: 12, fontFamily: FONTS.semiBold },

  gate: { flex: 1, padding: SPACING.screenPadding, paddingTop: 40, gap: 10 },
  gateTitle: { color: COLORS.text, fontSize: 18, fontFamily: FONTS.bold },
  gateDetail: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.regular, marginBottom: 10 },
  input: {
    backgroundColor:   "rgba(0,0,0,0.3)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.1)",
    borderRadius:      10,
    paddingHorizontal: 16,
    paddingVertical:   14,
    color:             "#fff",
    fontSize:          14,
    fontFamily:        FONTS.semiBold,
  },
  gateError: { color: COLORS.red, fontSize: 12, fontFamily: FONTS.regular },
  gateButton: { borderRadius: RADIUS.small, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  gateButtonText: { color: "#000", fontSize: 14, fontFamily: FONTS.bold },
});
