import React from "react";
import { setAmbientTrack, playUISound } from "../../../src/audio/audioEngine";
import VolumeSlider from "./VolumeSlider";
import "./AmbientPlayer.css";

const TRACKS = [
  
  { id: "focus",        label: "Focus",          icon: "◉", minTier: 0, desc: "Arctic drone — default" },
  // PRO (tier 1)
  { id: "rain",         label: "Rain",            icon: "⌁", minTier: 1, desc: "Heavy rainfall texture" },
  { id: "cyberpunk",    label: "Cyberpunk City",  icon: "⬡", minTier: 1, desc: "Night city hum" },
  { id: "library",      label: "Library",         icon: "◫", minTier: 1, desc: "Quiet AC hum & page turns" },
  { id: "lofi",         label: "Lo-Fi",           icon: "♫", minTier: 1, desc: "Vinyl warmth & chord tones" },
  // ELITE (tier 2)
  { id: "deepspace",    label: "Deep Space",      icon: "◎", minTier: 2, desc: "Cosmic low drone" },
  { id: "spacestation", label: "Space Station",   icon: "⬡", minTier: 2, desc: "ISS hum + metallic clinks" },
  { id: "deepsea",      label: "Deep Sea",        icon: "≋", minTier: 2, desc: "Sub-bass + sonar pings" },
];

const AmbientPlayer = React.memo(({
  accountTier = 0,
  activeTrack = "focus",
  onTrackChange,
  addNotification,
  atmosphereVolume = 1,
  onAtmosphereVolumeChange,
}) => {
  const handleSelect = (track) => {
    if (track.minTier > accountTier) {
      const needed = track.minTier === 1 ? "Pro" : "Elite";
      addNotification?.({
        type: "SUCCESS",
        message: `Upgrade to ${needed} to unlock ${track.label}!`,
      });
      return;
    }
    playUISound(`ambience_${track.id}`);
    onTrackChange?.(track.id);
    setAmbientTrack(track.id);
  };

  return (
    <div className="ambient-player">
      <div className="ambient-header-row">
      </div>

      <div className="ambient-track-list">
        {TRACKS.map((t) => {
          const locked = t.minTier > accountTier;
          return (
            <button
              key={t.id}
              className={`ambient-track-btn ${activeTrack === t.id ? "active" : ""} ${locked ? "locked" : ""}`}
              onClick={() => handleSelect(t)}
              title={locked ? `Requires ${t.minTier === 1 ? "Pro" : "Elite"}` : t.desc}
            >
              <span className="track-icon">{t.icon}</span>
              <span className="track-name">{t.label}</span>
              {t.minTier > 0 && (
                <span
                  className={`track-lock-tag track-lock-tag--${t.minTier === 1 ? "pro" : "elite"}`}
                  style={locked ? undefined : { visibility: "hidden" }}
                  aria-hidden={!locked}
                >
                  {t.minTier === 1 ? "PRO" : "ELITE"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {onAtmosphereVolumeChange && (
        <div className="ambient-atmos-row">
          <span className="atmos-label">ATMOSPHERE</span>
          <input
            className="atmos-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={atmosphereVolume}
            onChange={(e) => onAtmosphereVolumeChange(parseFloat(e.target.value))}
          />
          <span className="atmos-pct">{Math.round(atmosphereVolume * 100)}%</span>
        </div>
      )}
    </div>
  );
});

export default AmbientPlayer;
