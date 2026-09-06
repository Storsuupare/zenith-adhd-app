import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Modal } from "react-native";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../constants/fonts";
import { Ionicons } from "@expo/vector-icons";

import AuthScreen           from "../screens/AuthScreen";
import DashboardScreen      from "../screens/DashboardScreen";
import ShopScreen           from "../screens/ShopScreen";
import ArchivesScreen       from "../screens/ArchivesScreen";
import SettingsScreen       from "../screens/SettingsScreen";
import SessionScreen        from "../screens/SessionScreen";
import AchievementsScreen   from "../screens/AchievementsScreen";
import MoreScreen           from "../screens/MoreScreen";
import LeaderboardScreen    from "../screens/LeaderboardScreen";
import FriendsScreen        from "../screens/FriendsScreen";
import ReleaseNotesScreen   from "../screens/ReleaseNotesScreen";
import PrivacyScreen        from "../screens/PrivacyScreen";
import TermsScreen          from "../screens/TermsScreen";
import RefundScreen         from "../screens/RefundScreen";
import PaymentSuccessScreen from "../screens/PaymentSuccessScreen";
import PaymentCancelScreen  from "../screens/PaymentCancelScreen";
import SolarBackdrop        from "../components/SolarBackdrop";
import NotificationToast    from "../components/NotificationToast";
import LoadingScreen        from "../components/LoadingScreen";
import OnboardingModal, { ONBOARDING_KEY } from "../components/OnboardingModal";
import WhatsNewModal        from "../components/WhatsNewModal";
import { WHATS_NEW, WHATS_NEW_KEY } from "../constants/whatsNew";
import { useTheme }         from "../context/ThemeContext";
import { COLORS }           from "../constants/colors";
import { useTasks }         from "../context/TaskContext";
import { useUser }          from "../context/UserContext";

// Lets OnboardingModal navigate (e.g. to Settings for the Neural Clock step)
// without needing a navigation prop — it's mounted at the root, above every
// tab, so it isn't a screen inside any Navigator and has no such prop of its own.
const navigationRef = createNavigationContainerRef();

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
      style={{
        position:        "absolute",
        top:             0,
        left:            0,
        width:           "100%",
        height:          "100%",
        backgroundColor: TAB_BAR_BG[activeTheme] ?? DEFAULT_NAV_BG,
      }}
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

// Settings, Achievements and History all check in occasionally rather than
// every session, so they live behind one "More" tab instead of each holding
// their own slot on a bottom bar that was already at the usual 5-tab ceiling.
function MoreStack() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="MoreMain"     component={MoreScreen} />
      <Stack.Screen name="Leaderboard"  component={LeaderboardScreen} />
      <Stack.Screen name="Friends"      component={FriendsScreen} />
      <Stack.Screen name="Awards"       component={AchievementsScreen} />
      <Stack.Screen name="History"      component={ArchivesScreen} />
      <Stack.Screen name="Settings"     component={SettingsScreen} />
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
            Home: focused ? "home"       : "home-outline",
            Shop: focused ? "storefront" : "storefront-outline",
            More: focused ? "menu"       : "menu-outline",
          };
          return <Ionicons name={icons[route.name]} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          // Dot only — a count would imply a to-do list rather than a reward.
          // Carries the same unseen-achievements signal the Awards tab used
          // to show directly, now that Awards lives one level deeper.
          tabBarBadge: achievementsUnseen ? "" : undefined,
          tabBarBadgeStyle: { backgroundColor: accentColor, minWidth: 10, maxHeight: 10, borderRadius: 5 },
        }}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  const { user } = useUser() || {};
  const { contracts, notifications, handleComplete, handleAbort, handlePause, handleResume } = useTasks();
  const activeContract = contracts?.[0] ?? null;

  // Show onboarding once per new user, or the "what's new" card once per update for returning
  // users — never both. New users already get the current feature set via onboarding, so a
  // redundant "what's new" popup right after would be noise, not signal. Sequenced in one
  // effect (not two separate ones) to avoid a race between the onboarding-seen read and the
  // whats-new-seen write for brand-new users.
  // Lives here (not on DashboardScreen) so the overlay it drives can stay visible across tab
  // switches — see the OnboardingModal import above for why.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWhatsNew,   setShowWhatsNew]   = useState(false);
  const introChecked = useRef(false);
  useEffect(() => {
    if (!user?.external_id || introChecked.current) return;
    introChecked.current = true;
    (async () => {
      const onboardingSeen = await AsyncStorage.getItem(ONBOARDING_KEY(user.external_id));
      if (!onboardingSeen) {
        setShowOnboarding(true);
        await AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version);
        return;
      }
      const whatsNewSeenVersion = await AsyncStorage.getItem(WHATS_NEW_KEY);
      if (whatsNewSeenVersion !== WHATS_NEW.version) setShowWhatsNew(true);
    })();
  }, [user?.external_id]);

  return (
    <>
      <Stack.Navigator screenOptions={stackOpts}>
        <Stack.Screen name="Tabs"           component={AppTabs} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="PaymentCancel"  component={PaymentCancelScreen} />
      </Stack.Navigator>

      <NotificationToast notifications={notifications} />

      <OnboardingModal
        visible={showOnboarding}
        userId={user?.external_id}
        onClose={() => setShowOnboarding(false)}
        navigation={navigationRef}
      />

      <WhatsNewModal
        visible={showWhatsNew}
        onClose={() => {
          setShowWhatsNew(false);
          AsyncStorage.setItem(WHATS_NEW_KEY, WHATS_NEW.version).catch(() => {});
        }}
      />

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
              key={activeContract.id}
              contract={activeContract}
              onComplete={handleComplete}
              onAbort={handleAbort}
              onPause={handlePause}
              onResume={handleResume}
            />
          )}
          <NotificationToast notifications={notifications} />
        </SolarBackdrop>
      </Modal>
    </>
  );
}

export default function AppNavigator() {
  const { isSignedIn, isLoaded } = useAuth();
  const { authChecked } = useUser() || {};

  // Clerk resolving its cached token isn't proof the session still holds — wait
  // for UserContext to confirm it against the server before showing the app.
  // Without this, a stale-but-locally-cached session flashes the full Dashboard
  // before anything has actually been verified.
  if (!isLoaded || (isSignedIn && !authChecked)) return <LoadingScreen />;

  return (
    <SolarBackdrop>
      <NavigationContainer ref={navigationRef} theme={ZenithTheme}>
        {isSignedIn ? <RootStack /> : <AuthStack />}
      </NavigationContainer>
    </SolarBackdrop>
  );
}
