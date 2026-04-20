import React from "react";


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
        <div className="hud-xp-group">
          <span className="total-xp-display">{totalXP.toLocaleString()}</span>
          <span className="xp-suffix">TOTAL XP</span>
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
    </div>
  );
};

export default StatHUD;