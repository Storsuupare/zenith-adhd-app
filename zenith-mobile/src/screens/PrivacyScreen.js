import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { COLORS } from "../constants/colors";

export default function PrivacyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Privacy Policy" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.effective}>Effective August 2026</Text>

        <Section title="What we collect">
          <Item label="Account info." text="Your email address and username, provided when you sign up." />
          <Item label="Task data." text="Task names, durations, timestamps, and completion status." />
          <Item label="Progress data." text="XP, skill levels, streak count, credits, and inventory items." />
          <Item label="Notification data." text="Only stored if you opt in to push notifications." />
          <Text style={styles.body}>We don't collect your location, contact list, or anything unrelated to the app.</Text>
        </Section>

        <Section title="How we use your data">
          <BulletItem text="To run Zenith and give you your XP, loot, and skill progress." />
          <BulletItem text="To send session reminders if you have notifications turned on." />
          <BulletItem text="To improve the app. We look at aggregate usage patterns, never individual task content." />
          <Text style={styles.body}>We don't sell your data. We don't use it for ads, and we don't track you across other apps or websites.</Text>
        </Section>

        <Section title="Third-party services">
          <Item label="Clerk." text="Handles sign-up and login. Stores your email address and authentication details." />
          <Item label="Railway." text="Backend and database hosting on EU-compliant servers." />
          <Item label="Vercel." text="The frontend is served through Vercel." />
          <Item label="RevenueCat." text="Processes subscription purchases and receipts. Receives your account ID and purchase history, never your payment card details — those stay with Apple." />
          <Item label="PostHog." text="Product analytics, hosted in the EU. Receives your account ID together with events like session length, skill, and subscription tier. Task names and other text you write are never sent." />
          <Text style={styles.body}>Each provider operates under its own privacy policy and processes data only on our instructions.</Text>
        </Section>

        <Section title="Why we're allowed to process it">
          <Item label="To provide the service." text="Running your account, sessions, and progress is necessary to deliver what you signed up for (GDPR Art. 6(1)(b))." />
          <Item label="Legitimate interest." text="Aggregate analytics that tell us which features are used, so we can improve the app (GDPR Art. 6(1)(f))." />
          <Item label="Consent." text="Push notifications, which you turn on yourself and can turn off at any time (GDPR Art. 6(1)(a))." />
        </Section>

        <Section title="Data retention">
          <Text style={styles.body}>Your account data is kept for as long as your account exists. Delete your account and everything goes with it — progress, credits, inventory, and session history.</Text>
          <Text style={styles.body}>Encrypted database backups may hold deleted data for up to 30 days before they roll over. Analytics events are retained for 12 months.</Text>
        </Section>

        <Section title="Your rights (GDPR)">
          <BulletItem text="Access — ask for a copy of the personal data we hold on you." />
          <BulletItem text="Rectification — have inaccurate data corrected." />
          <BulletItem text="Erasure — delete your account from Settings, or ask us to do it." />
          <BulletItem text="Portability — receive your session data in a machine-readable format." />
          <BulletItem text="Objection — object to processing based on legitimate interest." />
          <Text style={styles.body}>To exercise any of these, use Delete Account in Settings or email us. If you think we've handled your data wrongly, you can complain to your national data protection authority — in Finland, the Office of the Data Protection Ombudsman (tietosuoja.fi).</Text>
        </Section>

        <Section title="Security">
          <Text style={styles.body}>All data is transmitted over HTTPS. Login is handled by a dedicated authentication service — no passwords are stored by us.</Text>
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
    <View style={sStyles.section}>
      <Text style={sStyles.title}>{title}</Text>
      {children}
    </View>
  );
}
function Item({ label, text }) {
  return (
    <Text style={sStyles.body}>
      <Text style={sStyles.bold}>{label}</Text> {text}
    </Text>
  );
}
function BulletItem({ text }) {
  return <Text style={[sStyles.body, { paddingLeft: 8 }]}>· {text}</Text>;
}

const sStyles = StyleSheet.create({
  section: { marginBottom: 20 },
  title:   { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  body:    { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  bold:    { color: COLORS.text, fontWeight: "600" },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "transparent" },
  content:    { padding: 16, paddingBottom: 40 },
  effective:  { color: COLORS.textMuted, fontSize: 12, marginBottom: 20 },
  body:       { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  contact:    { color: COLORS.accent, fontSize: 13, textAlign: "center", marginTop: 8 },
});
