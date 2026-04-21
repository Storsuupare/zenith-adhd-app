import React from "react";
import { playUISound } from "../../../src/audio/audioEngine";
import "./ThemeSelector.css";

const THEMES = [
  { id: "default", label: "Classic", color: "#22d3ee", minTier: 0 },
  { id: "cobalt",  label: "Cobalt",  color: "#3b82f6", minTier: 1 },
  { id: "amber",   label: "Amber",   color: "#f59e0b", minTier: 1 },
  { id: "crimson", label: "Crimson", color: "#ef4444", minTier: 2 },
];

const ThemeSelector = ({ accountTier = 0, activeTheme = "default", onThemeChange, addNotification }) => {
  const handleSelect = (theme) => {
    if (theme.minTier > accountTier) {
      const needed = theme.minTier === 1 ? "Pro" : "Elite";
      addNotification?.({
        type: "SUCCESS",
        message: `Upgrade to ${needed} to unlock the ${theme.label} theme!`,
      });
      return;
    }
    playUISound(`theme_${theme.id}`);
    onThemeChange?.(theme.id);
  };

  return (
    <div className="theme-selector">
      <span className="theme-label">THEME</span>
      <div className="theme-swatch-row">
        {THEMES.map((t) => {
          const locked = t.minTier > accountTier;
          return (
            <button
              key={t.id}
              className={`theme-swatch ${activeTheme === t.id ? "active" : ""} ${locked ? "locked" : ""}`}
              style={{ "--swatch-color": t.color }}
              onClick={() => handleSelect(t)}
              title={locked ? `Requires ${t.minTier === 1 ? "Pro" : "Elite"}` : t.label}
            >
              <span className="swatch-dot" />
              <span className="swatch-label">{t.label}</span>
              {locked && <span className="swatch-lock-tag">{t.minTier === 1 ? "PRO" : "ELITE"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSelector;
