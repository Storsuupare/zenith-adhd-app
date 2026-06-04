import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Exact values from web App.css theme definitions
export const THEME_DATA = {
  default:  { accent: "#22d3ee", skyCore: "#03060b" },
  cobalt:   { accent: "#3b82f6", skyCore: "#030712" },
  amber:    { accent: "#f59e0b", skyCore: "#0d0800" },
  crimson:  { accent: "#ef4444", skyCore: "#0a0305" },
  violet:   { accent: "#8b5cf6", skyCore: "#050312" },
  jade:     { accent: "#10b981", skyCore: "#030f08" },
  neon:     { accent: "#f72585", skyCore: "#050108" },
  arctic:   { accent: "#67e8f9", skyCore: "#060e1e" },
  solar:    { accent: "#fb8500", skyCore: "#1a0900" },
  nebula:   { accent: "#7209b7", skyCore: "#04000e" },
  obsidian: { accent: "#6d28d9", skyCore: "#000000" },
  ghost:    { accent: "#e2e8f0", skyCore: "#0d0d12" },
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
