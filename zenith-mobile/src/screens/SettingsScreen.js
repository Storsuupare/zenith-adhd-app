import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, RefreshControl, Modal, Alert,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";
import { deleteAccount } from "../services/api";

function getClockRows() {
  return [
    { time: "12AM – 5AM",  label: "Red Zone. Rewards ×0.5.",   color: "#ff3b3b" },
    { time: "8AM – 11AM",  label: "Peak window. XP ×1.25.",    color: "#f5c518" },
    { time: "10PM – 12AM", label: "Hyperfocus. XP ×1.5.",      color: "#a855f7" },
  ];
}

export default function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();
  const { user, fetchUser } = useUser();
  const { accentColor } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };

  const hour       = new Date().getHours();
  const isRedzone  = hour >= 0 && hour < 5;
  const CLOCK_ROWS = getClockRows();
  const tierLabel  = user?.role === "ELITE" ? "Elite" : user?.role === "PRO" ? "Pro" : "Free";

  const NavRow = ({ label, screen }) => (
    <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate(screen)}>
      <Text style={styles.navLabel}>{label}</Text>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Row label="Plan"   value={tierLabel} />
          <Row label="Level"  value={String(user?.level ?? 1)} />
          {(user?.streak ?? 0) > 0 && (
            <Row label="Streak" value={`${user.streak} days`} />
          )}
        </View>

        {/* Neural Clock */}
        <View ref={onboardingRefs.neuralClock} style={styles.card}>
          <Text style={styles.cardTitle}>◎ Neural Clock</Text>
          <View style={[styles.statusBadge, isRedzone && { borderColor: COLORS.red + "55" }]}>
            <View style={[styles.statusDot, { backgroundColor: isRedzone ? COLORS.red : COLORS.green }]} />
            <Text style={styles.statusText}>
              {isRedzone ? "Red Zone active. Rewards halved until 5AM." : "Rewards shift with the time of day."}
            </Text>
          </View>
          {CLOCK_ROWS.map(row => (
            <Row key={row.time} label={row.time} value={row.label} valueColor={row.color} />
          ))}
        </View>

        {/* Navigation links */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>More</Text>
          <NavRow label="Release Notes" screen="ReleaseNotes" />
          <NavRow label="Privacy Policy" screen="Privacy" />
          <NavRow label="Terms of Service" screen="Terms" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠ Danger Zone</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your account, all progress, credits, and inventory. This cannot be undone.
            </Text>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.modalConfirmText}>
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  label: { color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  value: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: FONTS.semiBold },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  pageTitle: { color: COLORS.text, fontSize: 22, fontFamily: FONTS.bold, marginBottom: 4 },
  card: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 2,
  },
  cardTitle: { color: COLORS.text, fontSize: 13, fontFamily: FONTS.bold, marginBottom: 6 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  navLabel: { color: COLORS.text, fontSize: 14 },
  navArrow: { color: COLORS.textMuted, fontSize: 18 },
  signOutBtn: {
    backgroundColor: "rgba(255,34,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.45)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { color: COLORS.red, fontSize: 15, fontFamily: FONTS.semiBold },
  dangerCard: {
    backgroundColor: "rgba(255,34,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.3)",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  dangerTitle: { color: "#000", fontSize: 13, fontFamily: FONTS.bold, letterSpacing: 1, textAlign: "center" },
  deleteBtn: {
    backgroundColor: "rgba(255,34,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.45)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  deleteText: { color: COLORS.red, fontSize: 15, fontFamily: FONTS.semiBold },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.3)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontFamily: FONTS.bold },
  modalBody:  { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  modalConfirmBtn: {
    backgroundColor: "rgba(255,34,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,34,68,0.5)",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalConfirmText: { color: COLORS.red, fontSize: 14, fontFamily: FONTS.semiBold },
  modalCancelBtn: {
    padding: 12,
    alignItems: "center",
  },
  modalCancelText: { color: COLORS.textMuted, fontSize: 13 },
});
