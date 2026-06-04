import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./PrestigeCinematic.css";

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

function toRoman(n) {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let result = "";
  for (let i = 0; i < vals.length && n > 0; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result || "I";
}

export default function PrestigeCinematic({ skillName, prestigeLevel, creditReward, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const icon  = SKILL_ICONS[skillName] ?? "◈";
  const stars = "★".repeat(Math.min(prestigeLevel, 5));
  const roman = toRoman(prestigeLevel);

  return createPortal(
    <div
      className={`pc-root${visible ? " pc-visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Prestige achieved"
    >
      <div className="pc-overlay" onClick={onDismiss} />

      <div className="pc-card">
        <div className="pc-ambient-glow" aria-hidden="true" />

        <div className="pc-icon" aria-hidden="true">{icon}</div>
        <div className="pc-skill-name">{skillName}</div>

        <div className="pc-rank-banner">
          <span className="pc-rank-label">PRESTIGE</span>
          <span className="pc-rank-roman">{roman}</span>
        </div>

        <div className="pc-stars" aria-label={`${prestigeLevel} prestige${prestigeLevel !== 1 ? "s" : ""}`}>
          {stars}
        </div>

        <div className="pc-rewards">
          <div className="pc-reward-row">
            <span className="pc-reward-icon">◈</span>
            <span className="pc-reward-val">+{creditReward.toLocaleString()} CR</span>
            <span className="pc-reward-tag">Mythic Reward</span>
          </div>
          <div className="pc-reward-row">
            <span className="pc-reward-icon">▲</span>
            <span className="pc-reward-val">+10% XP</span>
            <span className="pc-reward-tag">Permanent · stacks each prestige</span>
          </div>
        </div>

        <button className="pc-claim-btn" onClick={onDismiss} autoFocus>
          Claim Reward →
        </button>
      </div>
    </div>,
    document.body
  );
}
