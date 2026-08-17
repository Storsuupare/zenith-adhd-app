import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { fetchUser, createUser, setAuthToken, syncSubscription } from "../services/api";
import { registerPushToken } from "../services/notifications";
import Purchases from "react-native-purchases";

const REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY;

// Drives the dot on the Achievements tab. Kept here rather than derived from an
// API count so the badge costs no extra request — session completion already
// tells us when something unlocked.
const ACHIEVEMENTS_UNSEEN_KEY = "zenith_achievements_unseen";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const { isSignedIn, getToken, userId } = useAuth();
  const [user, setUser] = useState(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [achievementsUnseen, setAchievementsUnseen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACHIEVEMENTS_UNSEEN_KEY)
      .then(value => setAchievementsUnseen(value === "1"))
      .catch(() => {});
  }, []);

  const markAchievementsUnseen = useCallback(() => {
    setAchievementsUnseen(true);
    AsyncStorage.setItem(ACHIEVEMENTS_UNSEEN_KEY, "1").catch(() => {});
  }, []);

  const clearAchievementsUnseen = useCallback(() => {
    setAchievementsUnseen(false);
    AsyncStorage.removeItem(ACHIEVEMENTS_UNSEEN_KEY).catch(() => {});
  }, []);

  // Refresh the Clerk JWT and attach it to every future axios request.
  // Clerk caches the token and only hits the network when it's close to expiry.
  const refreshToken = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);
    return token;
  }, [getToken]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await refreshToken();
      registerPushToken(token).catch(() => {});
      const res = await fetchUser(userId);
      setUser(res.data);
      if (REVENUECAT_KEY) Purchases.logIn(userId).catch(() => {});
    } catch (err) {
      // 404 means the user exists in Clerk but not in our DB yet — create them
      if (err.response?.status === 404) {
        try {
          await createUser({ username: userId, email: "" });
          const res = await fetchUser(userId);
          setUser(res.data);
          if (REVENUECAT_KEY) Purchases.logIn(userId).catch(() => {});
        } catch (createErr) {
          console.error("[UserContext] createUser failed:", createErr.message);
        }
      } else {
        console.error("[UserContext] loadUser failed:", err.message);
      }
    }
  }, [userId, refreshToken]);

  useEffect(() => {
    if (isSignedIn && userId) {
      loadUser();
    } else {
      setUser(null);
      setAuthToken(null);
    }
  }, [isSignedIn, userId]);

  // Re-links an existing App Store purchase to this account (reinstall, new device),
  // and also repairs a role that's drifted out of sync with what Apple actually has —
  // Purchases.restorePurchases() only confirms the entitlement on-device, it can't
  // write anything back to our database. syncSubscription() asks our server to pull
  // the confirmed state from RevenueCat directly and make it authoritative.
  const restorePurchases = useCallback(async () => {
    if (!REVENUECAT_KEY) return;
    setRestoringPurchases(true);

    try {
      await Purchases.restorePurchases();
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
      setRestoringPurchases(false);
      return;
    }

    try {
      const syncResponse = await syncSubscription();
      const resolvedRole = syncResponse.data?.role ?? "FREE";
      await loadUser();
      if (resolvedRole === "FREE") {
        Alert.alert("Nothing to restore", "No active subscription found for this Apple ID.");
      } else {
        Alert.alert("Restored", `Your ${resolvedRole} subscription has been restored.`);
      }
    } catch {
      // Apple already confirmed the restore above — only our own sync call failed.
      // The webhook will catch the account up on its own; this just couldn't force it now.
      await loadUser();
      Alert.alert(
        "Restored, but not fully synced",
        "Apple confirmed your purchase, but we couldn't verify it with our server just now. Pull to refresh in a moment.",
      );
    } finally {
      setRestoringPurchases(false);
    }
  }, [loadUser]);

  return (
    <UserContext.Provider value={{
      user, fetchUser: loadUser, refreshToken, userId,
      restorePurchases, restoringPurchases,
      achievementsUnseen, markAchievementsUnseen, clearAchievementsUnseen,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
