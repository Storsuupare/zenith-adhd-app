import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, SafeAreaView, Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import ScreenHeader from "../components/ScreenHeader";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { RADIUS, SPACING, SURFACE } from "../constants/layout";
import {
  searchUsers, sendFriendRequest, acceptFriendRequest,
  declineFriendRequest, removeFriend, fetchFriends,
  fetchInviteCode, redeemInviteCode,
} from "../services/api";

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

export default function FriendsScreen({ navigation }) {
  const { accentColor } = useTheme() || {};
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends]     = useState([]);
  const [incoming, setIncoming]   = useState([]);
  const [outgoing, setOutgoing]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [inviteCode, setInviteCode]   = useState(null);
  const [copyLabel, setCopyLabel]     = useState("Copy");
  const [redeemValue, setRedeemValue] = useState("");
  const [redeeming, setRedeeming]     = useState(false);
  const [redeemMessage, setRedeemMessage] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchInviteCode()
      .then(response => setInviteCode(response.data?.code ?? null))
      .catch(() => {});
  }, []);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 2000);
  };

  const handleShareCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Add me as a friend on Zenith! My invite code is ${inviteCode} — enter it under Friends → Have a code?`,
      });
    } catch {}
  };

  const handleRedeemCode = async () => {
    const code = redeemValue.trim();
    if (!code || redeeming) return;
    setRedeeming(true);
    setRedeemMessage(null);
    try {
      const response = await redeemInviteCode(code);
      const accepted = response.data?.status === "ACCEPTED";
      setRedeemMessage({
        ok: true,
        text: accepted ? `You and ${response.data.username} are now friends!` : `Friend request sent to ${response.data.username}.`,
      });
      setRedeemValue("");
      loadFriends();
    } catch (err) {
      const errorCode = err.response?.data?.error;
      const text =
        errorCode === "CODE_NOT_FOUND"        ? "That code doesn't match anyone." :
        errorCode === "CANNOT_FRIEND_SELF"    ? "That's your own code." :
        errorCode === "REQUEST_ALREADY_EXISTS" ? "You've already sent them a request." :
        "Couldn't redeem that code — try again.";
      setRedeemMessage({ ok: false, text });
    } finally {
      setRedeeming(false);
    }
  };

  const loadFriends = useCallback(() => {
    return fetchFriends()
      .then(response => {
        setFriends(response.data.friends ?? []);
        setIncoming(response.data.incoming_requests ?? []);
        setOutgoing(response.data.outgoing_requests ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFriends().finally(() => setLoading(false));
  }, [loadFriends]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(query.trim())
        .then(response => setResults(response.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleAdd = async (userId) => {
    try {
      const response = await sendFriendRequest(userId);
      const status = response.data?.status === "ACCEPTED" ? "ACCEPTED" : "PENDING";
      setResults(prev => prev.map(row => (row.id === userId ? { ...row, friendship_status: status, requested_by_me: true } : row)));
      loadFriends();
    } catch {}
  };

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id);
      loadFriends();
    } catch {}
  };

  const handleDecline = async (id) => {
    try {
      await declineFriendRequest(id);
      loadFriends();
    } catch {}
  };

  const handleRemove = async (id) => {
    try {
      await removeFriend(id);
      loadFriends();
    } catch {}
  };

  const resultActionLabel = (row) => {
    if (row.friendship_status === "ACCEPTED") return "Friends";
    if (row.friendship_status === "PENDING" && row.requested_by_me) return "Pending";
    if (row.friendship_status === "PENDING" && !row.requested_by_me) return "Invited you";
    return "Add";
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Friends" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionLabel text="Your invite code" />
        <View style={styles.inviteCard}>
          <Text style={styles.inviteCode}>{inviteCode ?? "…"}</Text>
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: accentColor }]}
              onPress={handleCopyCode}
              accessibilityRole="button"
              accessibilityLabel="Copy invite code"
            >
              <Text style={[styles.actionButtonText, { color: accentColor }]}>{copyLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: accentColor }]}
              onPress={handleShareCode}
              accessibilityRole="button"
              accessibilityLabel="Share invite code"
            >
              <Text style={[styles.actionButtonText, { color: accentColor }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.inviteHint}>Send this to a friend — no need to remember their username.</Text>

        <SectionLabel text="Have a code?" />
        <View style={styles.redeemRow}>
          <TextInput
            style={[styles.input, styles.redeemInput]}
            placeholder="Enter a friend's code"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={redeemValue}
            onChangeText={setRedeemValue}
            autoCorrect={false}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleRedeemCode}
          />
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: accentColor }, redeeming && { opacity: 0.5 }]}
            onPress={handleRedeemCode}
            disabled={redeeming}
            accessibilityRole="button"
            accessibilityLabel="Redeem code"
          >
            {redeeming
              ? <ActivityIndicator color={accentColor} size="small" />
              : <Text style={[styles.actionButtonText, { color: accentColor }]}>Add</Text>}
          </TouchableOpacity>
        </View>
        {redeemMessage && (
          <Text style={[styles.redeemMessage, { color: redeemMessage.ok ? COLORS.green : COLORS.red }]}>
            {redeemMessage.text}
          </Text>
        )}

        <SectionLabel text="Or search by username" />
        <TextInput
          style={styles.input}
          placeholder="Search by username"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searching && <ActivityIndicator color={accentColor} style={styles.spinner} />}

        {results.length > 0 && (
          <View style={styles.section}>
            {results.map(row => (
              <View key={row.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{row.username}</Text>
                  <Text style={styles.rowLevel}>Lv {row.level}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    row.friendship_status ? styles.actionButtonDisabled : { borderColor: accentColor },
                  ]}
                  onPress={() => (!row.friendship_status ? handleAdd(row.id) : null)}
                  disabled={!!row.friendship_status}
                  accessibilityRole="button"
                  accessibilityLabel={`${resultActionLabel(row)} ${row.username}`}
                >
                  <Text style={[styles.actionButtonText, !row.friendship_status && { color: accentColor }]}>
                    {resultActionLabel(row)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={accentColor} style={styles.spinner} />
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <SectionLabel text="Requests" />
                <View style={styles.section}>
                  {incoming.map(row => (
                    <View key={row.id} style={styles.row}>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName}>{row.username}</Text>
                        <Text style={styles.rowLevel}>Lv {row.level}</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { borderColor: accentColor }]}
                          onPress={() => handleAccept(row.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Accept ${row.username}`}
                        >
                          <Text style={[styles.actionButtonText, { color: accentColor }]}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDecline(row.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Decline ${row.username}`}
                        >
                          <Text style={styles.actionButtonText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <SectionLabel text="Sent" />
                <View style={styles.section}>
                  {outgoing.map(row => (
                    <View key={row.id} style={styles.row}>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowName}>{row.username}</Text>
                        <Text style={styles.rowLevel}>Lv {row.level}</Text>
                      </View>
                      <Text style={styles.pendingLabel}>Pending</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <SectionLabel text="Friends" />
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptyDetail}>Search for a username above to get started.</Text>
              </View>
            ) : (
              <View style={styles.section}>
                {friends.map(row => (
                  <View key={row.id} style={styles.row}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{row.username}</Text>
                      <Text style={styles.rowLevel}>Lv {row.level}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleRemove(row.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${row.username}`}
                    >
                      <Text style={styles.actionButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: SPACING.screenPadding, paddingBottom: 40, gap: 10 },

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
  spinner: { marginVertical: 12 },

  inviteCard: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    backgroundColor:   SURFACE.card,
    borderWidth:       1,
    borderColor:       SURFACE.cardBorder,
    borderRadius:      RADIUS.medium,
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  inviteCode: {
    color:         COLORS.text,
    fontSize:      20,
    fontFamily:    FONTS.bold,
    letterSpacing: 3,
  },
  inviteActions: { flexDirection: "row", gap: 8 },
  inviteHint: {
    color:      "rgba(255,255,255,0.3)",
    fontSize:   11,
    fontFamily: FONTS.regular,
    marginTop:  -2,
  },

  redeemRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  redeemInput: { flex: 1 },
  redeemMessage: { fontSize: 12, fontFamily: FONTS.regular, marginTop: -2 },

  sectionLabel: {
    color:         COLORS.textMuted,
    fontSize:      10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily:    FONTS.bold,
    marginTop:     8,
  },

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
    justifyContent:    "space-between",
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderTopWidth:    1,
    borderTopColor:    SURFACE.inset,
  },
  rowBody:  { gap: 2 },
  rowName:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  rowLevel: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },

  requestActions: { flexDirection: "row", gap: 8 },
  actionButton: {
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    borderRadius:      RADIUS.small,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: COLORS.text, fontSize: 11, fontFamily: FONTS.semiBold },
  pendingLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: FONTS.regular },

  emptyState:  { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyTitle:  { color: COLORS.text, fontSize: 14, fontFamily: FONTS.semiBold },
  emptyDetail: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, textAlign: "center" },
});
