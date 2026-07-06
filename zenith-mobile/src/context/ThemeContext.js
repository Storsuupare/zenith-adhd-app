import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [activeTheme, setActiveThemeState] = useState("default");

  // Load saved preferences on mount
  useEffect(() => {
    AsyncStorage.getItem("zenith_theme").then(theme => {
      if (theme && THEME_DATA[theme]) setActiveThemeState(theme);
    });
  }, []);

  const setActiveTheme = useCallback(async (id) => {
    setActiveThemeState(id);
    await AsyncStorage.setItem("zenith_theme", id);
  }, []);

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
