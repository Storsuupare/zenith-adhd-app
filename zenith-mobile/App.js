import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import Purchases from "react-native-purchases";
import { requestNotificationPermissions, scheduleNotifications } from "./src/services/notifications";
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
  }, []);

  if (!fontsLoaded && !fontError) return <LoadingScreen />;

  return (
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
  );
}
