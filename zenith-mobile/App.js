import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import { requestNotificationPermissions, scheduleNotifications } from "./src/services/notifications";
import { reportClientError } from "./src/services/api";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { UserProvider } from "./src/context/UserContext";
import { TaskProvider, useTasks } from "./src/context/TaskContext";
import { ThemeProvider } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import LootDisplay       from "./src/components/LootDisplay";
import LevelUpModal      from "./src/components/LevelUpModal";
import PrestigeCinematic from "./src/components/PrestigeCinematic";
import EarningSummary    from "./src/components/EarningSummary";
import LoadingScreen     from "./src/components/LoadingScreen";
import ErrorBoundary     from "./src/components/ErrorBoundary";

const tokenCache = {
  async getToken(key) {
    try { return await SecureStore.getItemAsync(key); }
    catch { return null; }
  },
  async saveToken(key, value) {
    try { await SecureStore.setItemAsync(key, value); }
    catch {}
  },
};

const CLERK_KEY        = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const REVENUECAT_KEY   = process.env.EXPO_PUBLIC_REVENUECAT_KEY;

function Overlays() {
  const { loot, setLoot, levelUpData, dismissLevelUp, prestigeData, setPrestigeData } = useTasks();
  const [earningSummary, setEarningSummary] = useState(null);

  return (
    <>
      <LootDisplay
        loot={loot}
        onDismiss={() => setLoot(null)}
      />
      <LevelUpModal
        data={levelUpData}
        onDismiss={dismissLevelUp}
      />
      <PrestigeCinematic
        skillName={prestigeData?.skillName}
        prestigeLevel={prestigeData?.prestigeLevel}
        creditReward={prestigeData?.creditReward}
        redzoneImmunity={prestigeData?.redzoneImmunity}
        onDismiss={() => setPrestigeData(null)}
      />

      <EarningSummary
        data={earningSummary}
        onDismiss={() => setEarningSummary(null)}
      />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (REVENUECAT_KEY) {
      try { Purchases.configure({ apiKey: REVENUECAT_KEY }); } catch {}
    }
    requestNotificationPermissions().then(granted => {
      if (granted) scheduleNotifications();
    });

    // Catches JS exceptions that escape everywhere else — event handlers, async
    // callbacks — which a React error boundary cannot see (it only catches
    // errors thrown during rendering). Reports first, then always defers to the
    // platform's own previous handler so React Native's normal crash/reload
    // behavior is preserved, not silently swallowed.
    const previousHandler = global.ErrorUtils?.getGlobalHandler?.();
    global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
      reportClientError({
        message:    error?.message ?? "Unknown error",
        stack:      error?.stack,
        platform:   Platform.OS,
        screen:     isFatal ? "fatal_js_error" : "js_error",
        appVersion: Constants.expoConfig?.version,
      });
      previousHandler?.(error, isFatal);
    });
  }, []);

  if (!fontsLoaded && !fontError) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <StatusBar style="light" />
        <ThemeProvider>
          <UserProvider>
            <TaskProvider>
              <AppNavigator />
              <Overlays />
            </TaskProvider>
          </UserProvider>
        </ThemeProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
