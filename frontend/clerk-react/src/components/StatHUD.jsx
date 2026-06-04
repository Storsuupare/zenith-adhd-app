import React from "react";
import SystemResourceHUD from "./SystemResourceHUD";

const TIER_LABELS = ["", "PRO", "ELITE"];

const StatHUD = ({
  currentLevel,
  totalXP,
  progressPercent,
  previewXP,
  streak,
  xpRemaining,
  nextLevelXP,
  currentLevelXP,
  getRank,
  onLogout,
  credits,
  sysVersion,
  accountTier  = 0,
  xpGain        = 0,
  xpBurstKey    = 0,
  isRedzone     = false,
  onDailyBonus,
  bonusClaimed  = false,
}) => {
  const ghostPercent = Math.min(
    ((currentLevelXP + previewXP) / nextLevelXP) * 100,
    100,
  );

  const tierLabel = TIER_LABELS[Math.min(accountTier, 2)];

  return (
    <div className={`level-container${isRedzone ? " redzone-active" : ""}${accountTier >= 2 ? " tier-elite-hud" : accountTier >= 1 ? " tier-pro-hud" : ""}`}>

      <div className="hud-top-row">
        <div className="hud-rank-group">
          <div className="rank-label-row">
            <span className="rank-label">Rank</span>
            {tierLabel && (
              <span className={`tier-badge tier-badge--${accountTier}`}>
                {tierLabel}
              </span>
            )}
            {isRedzone && (
              <span className="redzone-badge">RED ZONE</span>
            )}
          </div>
          <span className="rank-text">
            {getRank(currentLevel)}
            <span className="lvl-tag"> LVL {currentLevel}</span>
          </span>
        </div>

        <div className="hud-right-group">
          <div className="hud-xp-group">
            <span className="total-xp-display">{totalXP.toLocaleString()}</span>
            <span className="xp-suffix">Total XP</span>
          </div>
        </div>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill ghost"
          style={{ width: `${ghostPercent}%`, opacity: previewXP > 0 ? 1 : 0 }}
        />
        <div
          className={`progress-fill${xpGain > 0 ? " surge" : ""}`}
          style={{ width: `${progressPercent}%` }}
        >
          <div className="fill-glare" />
        </div>
        {xpGain > 0 && (
          <div className="xp-reward-burst" key={xpBurstKey}>
            +{xpGain.toLocaleString()} XP
          </div>
        )}
      </div>

      <div className="hud-bottom-row">
        <div className="xp-remaining">
          {xpRemaining.toLocaleString()} XP to next level
        </div>
        <div className={`streak-display${streak > 0 ? " momentum-active" : ""}`}>
          <span className="flame-icon">🔥</span>
          {streak} day streak
          {streak > 0 && (
            <span className="multiplier-badge">
              x{Math.min(1 + streak * 0.05, 2.0).toFixed(2)} XP
            </span>
          )}
        </div>
      </div>
      {streak === 0 && (
        <p className="streak-hint">Complete a mission to start your streak</p>
      )}

      <SystemResourceHUD
        credits={credits}
        sysVersion={sysVersion}
        accountTier={accountTier}
        onDailyBonus={onDailyBonus}
        bonusClaimed={bonusClaimed}
      />
    </div>
  );
};

export default StatHUD;
