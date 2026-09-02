import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";

export default function TermsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Terms of Service" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.effective}>Effective May 2026</Text>

        <Section title="The service">
          <Text style={styles.body}>Zenith helps you build focus and momentum by turning your work into a structured game. By creating an account you're agreeing to these terms.</Text>
        </Section>

        <Section title="Your account">
          <Bullet text="You must be at least 16 to create an account." />
          <Bullet text="You're responsible for everything that happens under your account." />
          <Bullet text="One account per person. Don't share it." />
          <Bullet text="If you think your account has been compromised, contact us right away." />
        </Section>

        <Section title="Subscriptions and billing">
          <Text style={styles.body}>Zenith has two paid plans, PRO and ELITE, both billed monthly at the price shown on the App Store for your region — pricing varies by country and currency.</Text>
          <Bullet text="Plans renew automatically each month." />
          <Bullet text="Cancel any time. You keep access until the end of the billing period." />
          <Bullet text="Refunds are handled by Apple, not Zenith — see our Refund Policy in Settings." />
          <Bullet text="Failed payment means your account drops to Free." />
        </Section>

        <Section title="Acceptable use">
          <Text style={styles.body}>Keep it honest. Don't do any of the following:</Text>
          <Bullet text="Exploit bugs or glitches to get XP or credits you didn't earn." />
          <Bullet text="Use bots or scripts to interact with the service." />
          <Bullet text="Try to access someone else's account or data." />
          <Bullet text="Use Zenith for anything illegal." />
          <Bullet text="Try to reverse-engineer or extract the source code." />
          <Text style={styles.body}>Break these rules and your account gets suspended or banned. No refund.</Text>
        </Section>

        <Section title="Intellectual property">
          <Text style={styles.body}>Everything in Zenith (UI, branding, game mechanics, code) is ours. Your task content belongs to you.</Text>
        </Section>

        <Section title="Disclaimer">
          <Text style={styles.body}>Zenith is provided as-is. We don't guarantee availability or specific results. Our liability is limited to what you paid in the 30 days before any claim.</Text>
        </Section>

        <Section title="Changes to these terms">
          <Text style={styles.body}>We'll update these terms when needed. Big changes get announced in Release Notes or by email.</Text>
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
  content:    { padding: 16, paddingBottom: 40 },
  effective:  { color: COLORS.textMuted, fontSize: 12, marginBottom: 20 },
  body:       { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  contact:    { color: COLORS.accent, fontSize: 13, textAlign: "center", marginTop: 8 },
});
