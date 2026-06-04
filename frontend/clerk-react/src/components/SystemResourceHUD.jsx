import React, { useState } from "react";
import "./SystemResourceHUD.css";

const SystemResourceHUD = React.memo(({
  credits = 0,
  accountTier = 0,
  onDailyBonus,
  bonusClaimed = false,
}) => {
  const showDailyBonus = !bonusClaimed && typeof onDailyBonus === "function";
  const [bonusBusy, setBonusBusy] = useState(false);

  const handleDailyBonusClick = async () => {
    if (bonusBusy) return;
    setBonusBusy(true);
    try { await Promise.resolve(onDailyBonus()); } finally { setBonusBusy(false); }
  };

  return (
    <div className="sysres-hud">
      <div className="sysres-capsule-row">
        <div className="sysres-capsule credits-capsule">
          <span className="capsule-icon">◈</span>
          <div className="capsule-body">
            <span className="capsule-value">{Number(credits).toLocaleString()}</span>
            <span className="capsule-label">Credits</span>
          </div>
          {showDailyBonus && (
            <button
              className="daily-bonus-btn"
              onClick={handleDailyBonusClick}
              disabled={bonusBusy}
              title="Claim daily credit bonus">
              {bonusBusy ? "···" : "◈ CLAIM"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default SystemResourceHUD;
