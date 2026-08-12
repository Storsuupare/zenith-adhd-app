import React from "react";
import { View, StyleSheet, Modal } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "@clerk/clerk-expo";
import { FONTS } from "../constants/fonts";
import { Ionicons } from "@expo/vector-icons";

import AuthScreen           from "../screens/AuthScreen";
import DashboardScreen      from "../screens/DashboardScreen";
import ShopScreen           from "../screens/ShopScreen";
import ArchivesScreen       from "../screens/ArchivesScreen";
import SettingsScreen       from "../screens/SettingsScreen";
import SessionScreen        from "../screens/SessionScreen";
import AchievementsScreen   from "../screens/AchievementsScreen";
import ReleaseNotesScreen   from "../screens/ReleaseNotesScreen";
import PrivacyScreen        from "../screens/PrivacyScreen";
import TermsScreen          from "../screens/TermsScreen";
import RefundScreen         from "../screens/RefundScreen";
import PaymentSuccessScreen from "../screens/PaymentSuccessScreen";
import PaymentCancelScreen  from "../screens/PaymentCancelScreen";
import SolarBackdrop        from "../components/SolarBackdrop";
import { useTheme }         from "../context/ThemeContext";
import { COLORS }           from "../constants/colors";
import { useTasks }         from "../context/TaskContext";
import { useUser }          from "../context/UserContext";

// Per-theme dark base that tints the navbar glass —
// matched to each theme's night sky top color at ~72% opacity
// Per-theme dark base that tints the navbar glass
const TAB_BAR_BG = {
  neon:     "rgba(5,1,8,0.72)",
  arctic:   "rgba(6,14,30,0.72)",
  solar:    "rgba(26,9,0,0.72)",
  nebula:   "rgba(4,0,14,0.72)",
  obsidian: "rgba(0,0,0,0.72)",
  ember:    "rgba(13,13,18,0.72)",
};
const DEFAULT_NAV_BG = "rgba(9,12,19,0.72)";

function TabBarBackground() {
  const { activeTheme } = useTheme() || {};
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: TAB_BAR_BG[activeTheme] ?? DEFAULT_NAV_BG },
      ]}
    />
  );
}

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// Override React Navigation's default white theme with Zenith's dark palette.
// Without this, NavigationContainer paints everything white behind our solar backdrop.
const ZenithTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background:   "transparent",
    card:         "rgba(9,12,19,0.92)",
    text:         COLORS.text,
    border:       COLORS.border,
    primary:      COLORS.accent,
    notification: COLORS.accent,
  },
};

const stackOpts = {
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
  cardStyle:    { backgroundColor: "transparent" },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// Settings slides into sub-pages via its own stack
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="ReleaseNotes" component={ReleaseNotesScreen} />
      <Stack.Screen name="Privacy"      component={PrivacyScreen} />
      <Stack.Screen name="Terms"        component={TermsScreen} />
      <Stack.Screen name="Refund"       component={RefundScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { accentColor } = useTheme();
  const { achievementsUnseen } = useUser() || {};
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: "transparent" },
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor:  "rgba(255,255,255,0.08)",
          borderTopWidth:  1,
        },
        tabBarActiveTintColor:   accentColor,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2, fontFamily: FONTS.semiBold, letterSpacing: 0.5 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:         focused ? "home"       : "home-outline",
            Shop:         focused ? "storefront" : "storefront-outline",
            History:      focused ? "time"       : "time-outline",
            Achievements: focused ? "trophy"     : "trophy-outline",
            Settings:     focused ? "settings"   : "settings-outline",
          };
          return <Ionicons name={icons[route.name]} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={DashboardScreen} />
      <Tab.Screen name="Shop"    component={ShopScreen} />
      <Tab.Screen name="History" component={ArchivesScreen} />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarLabel: "Awards",
          // Dot only — a count would imply a to-do list rather than a reward.
          tabBarBadge: achievementsUnseen ? "" : undefined,
          tabBarBadgeStyle: { backgroundColor: accentColor, minWidth: 10, maxHeight: 10, borderRadius: 5 },
        }}
      />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

function RootStack() {
  const { contracts, handleComplete, handleAbort } = useTasks();
  const activeContract = contracts?.[0] ?? null;

  return (
    <>
      <Stack.Navigator screenOptions={stackOpts}>
        <Stack.Screen name="Tabs"           component={AppTabs} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="PaymentCancel"  component={PaymentCancelScreen} />
      </Stack.Navigator>

      {/* Full-screen session takeover — floats above everything when a session is running */}
      <Modal
        visible={!!activeContract}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        <SolarBackdrop>
          {activeContract && (
            <SessionScreen
              contract={activeContract}
              onComplete={handleComplete}
              onAbort={handleAbort}
            />
          )}
        </SolarBackdrop>
      </Modal>
    </>
  );
}

export default function AppNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;

  return (
    <SolarBackdrop>
      <NavigationContainer theme={ZenithTheme}>
        {isSignedIn ? <RootStack /> : <AuthStack />}
      </NavigationContainer>
    </SolarBackdrop>
  );
}
