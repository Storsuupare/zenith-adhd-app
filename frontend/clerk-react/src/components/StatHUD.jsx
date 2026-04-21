import React from "react";
import SystemResourceHUD from "./SystemResourceHUD";


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
  clerkId,
  refreshKey,
}) => {
  const ghostPercent = Math.min(((currentLevelXP + previewXP) / nextLevelXP) * 100, 100);

  return (
    <div className="level-container">
      <div className="hud-top-row">
        <div className="hud-rank-group">
          <span className="rank-label">CURRENT RANK</span>
          <span className="rank-text">
            {getRank(currentLevel)}
            <span className="lvl-tag"> LVL {currentLevel}</span>
          </span>
        </div>
        <div className="hud-right-group">
          <div className="hud-xp-group">
            <span className="total-xp-display">{totalXP.toLocaleString()}</span>
            <span className="xp-suffix">TOTAL XP</span>
          </div>
          {onLogout && (
            <button className="hud-logout-btn" onClick={onLogout}>
              <span>⏻</span>
              <span className="logout-text">Log Out</span>
            </button>
          )}
        </div>
      </div>

      <div className="progress-track">
       
        <div
          className="progress-fill ghost"
          style={{ width: `${ghostPercent}%`, opacity: previewXP > 0 ? 1 : 0 }}
        />
        
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}>
          <div className="fill-glare" />
        </div>
      </div>

      <div className="hud-bottom-row">
        <div className="streak-display">STREAKS: {streak}</div>
        <div className="xp-remaining">{xpRemaining.toLocaleString()} XP TO NEXT LEVEL</div>
      </div>

      <SystemResourceHUD clerkId={clerkId} refreshKey={refreshKey} />
    </div>
  );
};

export default StatHUD;