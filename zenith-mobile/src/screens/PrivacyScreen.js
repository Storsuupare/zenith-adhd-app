import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking } from "react-native";
import { COLORS } from "../constants/colors";

export default function PrivacyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Privacy Policy</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.effective}>Effective May 2026</Text>

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
          <Text style={styles.body}>We don't sell your data. We don't use it for ads.</Text>
        </Section>

        <Section title="Third-party services">
          <Item label="Railway." text="Backend and database hosting on EU-compliant servers." />
          <Item label="Vercel." text="The frontend is served through Vercel." />
        </Section>

        <Section title="Your rights (GDPR)">
          <Text style={styles.body}>If you're in the EU or EEA, you can request access, correction, deletion, or portability of your data. Use the Delete Account option in Settings or contact us.</Text>
        </Section>

        <Section title="Data retention">
          <Text style={styles.body}>Delete your account and everything goes with it. Once it's gone, it's gone.</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "rgba(9,12,19,0.6)",
  },
  back:       { color: COLORS.accent, fontSize: 18 },
  pageTitle:  { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  content:    { padding: 16, paddingBottom: 40 },
  effective:  { color: COLORS.textMuted, fontSize: 12, marginBottom: 20 },
  body:       { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  contact:    { color: COLORS.accent, fontSize: 13, textAlign: "center", marginTop: 8 },
});
