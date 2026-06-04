import React, { useEffect, useRef } from "react";
import "./LevelUpModal.css";

const TIER_CLASSES = ["", "tier-pro", "tier-elite"];
const TIER_BOOST   = ["", "1.5× XP BOOST", "2× SURGE ACTIVE"];

const LevelUpModal = ({ data, onDismiss }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  if (!data) return null;

  const { level, rank, xpGain, tier = 0, skillName } = data;
  const tierClass  = TIER_CLASSES[Math.min(tier, 2)] || "";
  const boostLabel = TIER_BOOST[Math.min(tier, 2)];

  return (
    <div className={`levelup-overlay ${tierClass}`} onClick={onDismiss}>
      {tier >= 1 && <div className="levelup-surge" aria-hidden="true" />}
      <div
        className={`levelup-card ${tier >= 2 ? "glitch-active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="levelup-flash" />

        <div className="levelup-header">
          <span className="levelup-event-label">SYSTEM EVENT</span>
          {boostLabel && (
            <span className={`levelup-boost-badge ${tierClass}`}>{boostLabel}</span>
          )}
        </div>

        <div className="levelup-core">
          <span className="levelup-tag">LEVEL</span>
          <span className={`levelup-number ${tierClass}`}>{level}</span>
          <span className={`levelup-rank ${tierClass}`}>{rank}</span>
        </div>

        {skillName && (
          <div className="levelup-skill-line">
            <span className="levelup-skill-label">SKILL ADVANCED</span>
            <span className="levelup-skill-name">{skillName.toUpperCase()}</span>
          </div>
        )}

        {xpGain > 0 && (
          <div className="levelup-xp-gain">
            <span className="levelup-xp-label">XP GAINED</span>
            <span className={`levelup-xp-value ${tierClass}`}>
              +{xpGain.toLocaleString()}
            </span>
          </div>
        )}

        <div className="levelup-dismiss-bar">
          <div className="levelup-dismiss-fill" />
        </div>
        <span className="levelup-dismiss-hint">CLICK TO DISMISS</span>
      </div>
    </div>
  );
};

export default LevelUpModal;
