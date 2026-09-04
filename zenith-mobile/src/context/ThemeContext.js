import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";

export const THEME_DATA = {
  default:  { accent: "#22d3ee", skyCore: "#03060b" },  // electric cyan
  cobalt:   { accent: "#3b82f6", skyCore: "#030712" },  // royal blue
  amber:    { accent: "#f59e0b", skyCore: "#0d0800" },  // golden amber
  crimson:  { accent: "#ef4444", skyCore: "#0a0305" },  // vivid red
  violet:   { accent: "#a855f7", skyCore: "#050312" },  // bright violet
  jade:     { accent: "#34d399", skyCore: "#030f08" },  // vivid emerald
  neon:     { accent: "#f72585", skyCore: "#050108" },  // hot pink
  arctic:   { accent: "#38bdf8", skyCore: "#060e1e" },  // vivid sky blue
  solar:    { accent: "#f97316", skyCore: "#1a0900" },  // bright orange
  nebula:   { accent: "#d946ef", skyCore: "#04000e" },  // bright fuchsia-purple
  obsidian: { accent: "#818cf8", skyCore: "#000000" },  // electric indigo
  ember:    { accent: "#fb923c", skyCore: "#0d0906" },  // glowing coral-orange
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { userId } = useAuth();
  const [activeTheme, setActiveThemeState] = useState("default");

  // Keyed per Clerk user, not a single global key — ThemeProvider sits above
  // sign-in/sign-out in the tree and never unmounts, so a bare "zenith_theme"
  // key would leak whatever account was last signed in on this device into
  // the next one, including a purchased theme nobody on the new account paid
  // for. Reset to default immediately on every user change (never trust the
  // previous account's in-memory value even for an instant), then load this
  // specific user's own saved choice, if any.
  useEffect(() => {
    setActiveThemeState("default");
    if (!userId) return;
    AsyncStorage.getItem(`zenith_theme_${userId}`).then(theme => {
      if (theme && THEME_DATA[theme]) setActiveThemeState(theme);
    });
  }, [userId]);

  const setActiveTheme = useCallback(async (id) => {
    setActiveThemeState(id);
    if (userId) await AsyncStorage.setItem(`zenith_theme_${userId}`, id);
  }, [userId]);

  // Preview-only: updates visuals without persisting to storage.
  // Force-closing during a preview reverts to the saved theme on next launch.
  const previewTheme = useCallback((id) => {
    setActiveThemeState(id);
  }, []);

  const theme = THEME_DATA[activeTheme] || THEME_DATA.default;

  return (
    <ThemeContext.Provider value={{
      activeTheme, setActiveTheme, previewTheme,
      accentColor: theme.accent,
      skyCore:     theme.skyCore,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
