import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { fetchUser, createUser, setAuthToken } from "../services/api";
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

  // Re-links an existing App Store purchase to this account. Covers the most common
  // "I paid but it shows Free" case (reinstall, new device) without an Apple refund ticket.
  const restorePurchases = useCallback(async () => {
    if (!REVENUECAT_KEY) return;
    setRestoringPurchases(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        await loadUser();
        Alert.alert("Restored", "Your subscription has been restored.");
      } else {
        Alert.alert("Nothing to restore", "No active subscription found for this Apple ID.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
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
