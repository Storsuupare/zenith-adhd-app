import React, { useState, useEffect } from "react";
import "./SystemResourceHUD.css";

const BW_STATUS = (pct) => {
  if (pct < 20) return "critical";
  if (pct < 50) return "low";
  return "nominal";
};

const SystemResourceHUD = ({ clerkId, refreshKey = 0 }) => {
  const [credits,     setCredits]     = useState(0);
  const [bandwidth,   setBandwidth]   = useState(100);
  const [maxBandwidth, setMaxBandwidth] = useState(100);
  const [sysVersion,  setSysVersion]  = useState(1);
  const [expData,     setExpData]     = useState(0);

  useEffect(() => {
    if (!clerkId) return;

    fetch(`http://localhost:8000/system/profile/${clerkId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("API Response:", data);
        setCredits(data.system_credits     ?? 0);
        setBandwidth(data.current_bandwidth ?? 100);
        setMaxBandwidth(data.max_bandwidth  ?? 100);
        setSysVersion(data.system_version   ?? 1);
        setExpData(data.experience_data     ?? 0);
      })
      .catch((err) => console.warn("[SYSTEM HUD] Fetch failed:", err.message));
  }, [clerkId, refreshKey]);

  const bwPct    = maxBandwidth > 0 ? Math.min((bandwidth / maxBandwidth) * 100, 100) : 0;
  const bwStatus = BW_STATUS(bwPct);

  const xpThreshold = 1000 * sysVersion;
  const xpWithin    = expData % xpThreshold;
  const xpPct       = Math.min((xpWithin / xpThreshold) * 100, 100);

  return (
    <div className="sysres-hud">

      {/* ── Header: title + version badge + credits ── */}
      <div className="sysres-header">
        <div className="sysres-title-group">
          <span className="sysres-dim-label">NEURAL SYSTEM</span>
          <span className="sysres-version-badge">v{sysVersion}.0</span>
        </div>
        <div className="sysres-credits-group">
          <span className="sysres-credits-value">{credits.toLocaleString()}</span>
          <span className="sysres-accent-label">CREDITS</span>
        </div>
      </div>

      {/* ── Neural Bandwidth bar ── */}
      <div className="sysres-bar-section">
        <div className="sysres-bar-row">
          <span className="sysres-dim-label">NEURAL BANDWIDTH</span>
          <span className={`sysres-bar-readout ${bwStatus}`}>
            {bandwidth}
            <span className="sysres-bar-max">/{maxBandwidth}</span>
          </span>
        </div>
        <div className="sysres-track">
          <div
            className={`sysres-fill bw-fill ${bwStatus}`}
            style={{ width: `${bwPct}%` }}
          />
        </div>
      </div>

      {/* ── Experience Data bar ── */}
      <div className="sysres-bar-section">
        <div className="sysres-bar-row">
          <span className="sysres-dim-label">EXPERIENCE DATA</span>
          <span className="sysres-bar-readout dim">
            {xpWithin.toLocaleString()}
            <span className="sysres-bar-max">/{xpThreshold.toLocaleString()}</span>
          </span>
        </div>
        <div className="sysres-track">
          <div className="sysres-fill xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

    </div>
  );
};

export default SystemResourceHUD;
