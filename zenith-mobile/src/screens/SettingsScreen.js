import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useUser } from "../context/UserContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS } from "../constants/colors";
import { FONTS } from "../constants/fonts";
import onboardingRefs from "../utils/onboardingRefs";

function getClockRows(accentColor) {
  return [
    { time: "12AM – 7AM",  label: "Red Zone. Rewards halved.",  color: COLORS.red    },
    { time: "8AM – 11AM",  label: "Best XP of the day.",        color: COLORS.green  },
    { time: "2PM – 4PM",   label: "Slower rewards.",            color: "#facc15"     },
    { time: "10PM – 12AM", label: "Hyperfocus window.",         color: accentColor   },
  ];
}

export default function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();
  const { user }    = useUser();
  const { accentColor } = useTheme();

  const hour       = new Date().getHours();
  const isRedzone  = hour >= 0 && hour < 7;
  const CLOCK_ROWS = getClockRows(accentColor);
  const tierLabel  = user?.role === "ELITE" ? "Elite" : user?.role === "PRO" ? "Pro" : "Free";

  const NavRow = ({ label, screen }) => (
    <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate(screen)}>
      <Text style={styles.navLabel}>{label}</Text>
      <Text style={styles.navArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
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
              {isRedzone ? "Red Zone active. Rewards halved until 7AM." : "Rewards shift with the time of day."}
            </Text>
          </View>
          {CLOCK_ROWS.map(r => (
            <Row key={r.time} label={r.time} value={r.label} valueColor={r.color} />
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
      </ScrollView>
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
});
