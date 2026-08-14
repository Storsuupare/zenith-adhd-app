import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";
import { useUser } from "../context/UserContext";

export default function RefundScreen({ navigation }) {
  const { restorePurchases, restoringPurchases } = useUser();

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Refund Policy" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.effective}>Effective August 2026</Text>

        <Section title="How purchases work">
          <Text style={styles.body}>PRO and ELITE subscriptions are currently sold exclusively through the Apple App Store as in-app purchases. Zenith does not process or store your payment details, and doesn't bill you directly.</Text>
        </Section>

        <Section title="Paid but seeing Free?">
          <Text style={styles.body}>If you reinstalled Zenith or switched devices, your subscription usually just needs to be re-linked to your account — no refund needed.</Text>
          <TouchableOpacity
            style={[styles.restoreBtn, restoringPurchases && { opacity: 0.5 }]}
            onPress={restorePurchases}
            disabled={restoringPurchases}
          >
            <Text style={styles.restoreBtnText}>Restore purchases</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Requesting a refund">
          <Text style={styles.body}>If Restore purchases didn't fix it and you want your money back, that's handled by Apple, not Zenith — we have no ability to issue one ourselves.</Text>
          <Bullet text="Request one at reportaproblem.apple.com" />
          <Bullet text="Or from your iPhone: Settings → [your name] → Subscriptions" />
        </Section>

        <Section title="What Zenith can help with">
          <Text style={styles.body}>Credits cannot be bought with money. They are only earned in-app — by completing sessions, opening loot, unlocking awards, claiming the daily challenge, and prestiging a skill — so there is nothing to refund there. If you're double-charged or hit a billing bug on our end, contact us and we'll investigate and help you get it sorted.</Text>
        </Section>

        <Section title="Changes to this policy">
          <Text style={styles.body}>As Zenith adds new ways to pay (a website store, Android IAP once in development), this policy will be updated to match.</Text>
        </Section>

        <TouchableOpacity onPress={() => Linking.openURL("mailto:contact@zenithapp.org")}>
          <Text style={styles.contact}>Questions? contact@zenithapp.org</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={sStyles.title}>{title}</Text>
      {children}
    </View>
  );
}
function Bullet({ text }) {
  return <Text style={[sStyles.body, { paddingLeft: 8 }]}>· {text}</Text>;
}

const sStyles = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  body:  { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  scroll:     { flex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  effective:  { color: COLORS.textMuted, fontSize: 12, marginBottom: 20 },
  body:       { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  contact:    { color: COLORS.accent, fontSize: 13, textAlign: "center", marginTop: 8 },
  restoreBtn: {
    backgroundColor:   "rgba(5,8,15,0.7)",
    borderWidth:       1,
    borderColor:       COLORS.border,
    borderRadius:      8,
    paddingVertical:   10,
    alignItems:        "center",
    marginTop:         6,
  },
  restoreBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: "700" },
});
