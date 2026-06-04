import React, { useEffect } from "react";
import { SKILL_COLORS } from "../utils/constants";
import "./EarningSummary.css";

const AUTO_DISMISS_MS = 5000;

const SKILL_ICONS = {
  "LOGIC FLOW":  "⬡",
  "VITALITY":    "◈",
  "NUTRITION":   "◉",
  "ENVIRONMENT": "▣",
  "EXECUTION":   "◎",
  "LEARNING":    "⬢",
  "LOGISTICS":   "▤",
  "CREATIVITY":  "◆",
  "DISCIPLINE":  "◫",
  "PRESENCE":    "◑",
  "RECOVERY":    "◌",
  "RESOLVE":     "▲",
};

const EarningSummary = ({ data, onDismiss }) => {
  const { xpGained, creditsEarned, skillName, xpMultiplier, perkActive, duration, streak, levelUp } = data;

  const skillKey   = skillName?.toUpperCase();
  const skillColor = SKILL_COLORS[skillKey] || "#22d3ee";
  const skillGlow  = skillColor + "30"; // ~19% opacity hex alpha
  const skillIcon  = SKILL_ICONS[skillKey] || "◈";

  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="earning-overlay" onClick={onDismiss}>

      {/* Full-screen skill-color surge — fires immediately, fades out */}
      <div
        className="earning-surge"
        style={{ background: skillColor }}
        aria-hidden="true"
      />

      <div
        className="earning-card"
        style={{ "--skill-color": skillColor, "--skill-glow": skillGlow }}
        onClick={e => e.stopPropagation()}
      >

        {/* Level-up banner — only shown when the session caused a level-up */}
        {levelUp && (
          <div className="es-levelup-banner">
            <span className="es-lu-label">Level Up</span>
            <div className="es-lu-core">
              <span className="es-lu-num">{levelUp.level}</span>
              <span className="es-lu-rank">{levelUp.rank}</span>
            </div>
          </div>
        )}

        {/* Skill identity */}
        <div className="burst-skill-row">
          <span className="burst-skill-icon" aria-hidden="true">{skillIcon}</span>
          <span className="burst-skill-name">{skillName || "General"}</span>
        </div>

        {/* XP — the hero of this moment */}
        <div className="burst-xp-block">
          <span className="burst-xp">+{xpGained.toLocaleString()}</span>
          <span className="burst-xp-label">XP</span>
        </div>

        {/* Secondary rows */}
        <div className="earning-rows">
          {creditsEarned > 0 && (
            <div className="earning-row">
              <span className="er-label">Credits</span>
              <span className="er-value er-credits">+{creditsEarned} CR</span>
            </div>
          )}
          {duration && (
            <div className="earning-row">
              <span className="er-label">Session</span>
              <span className="er-value">{duration} min</span>
            </div>
          )}
          {streak > 0 && (
            <div className="earning-row">
              <span className="er-label">Streak</span>
              <span className="er-value er-streak">🔥 {streak} day{streak !== 1 ? "s" : ""}</span>
            </div>
          )}
          {xpMultiplier > 1 && perkActive && (
            <div className="earning-row">
              <span className="er-label">{perkActive}</span>
              <span className="er-value er-perk">×{xpMultiplier.toFixed(1)} XP</span>
            </div>
          )}
        </div>

        <div className="earning-countdown">
          <div
            className="earning-countdown-bar"
            style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
          />
        </div>

        <button className="earning-dismiss-btn" onClick={onDismiss}>
          Collect
        </button>

      </div>
    </div>
  );
};

export default EarningSummary;
