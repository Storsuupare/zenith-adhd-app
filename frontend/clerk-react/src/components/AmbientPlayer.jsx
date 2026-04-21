import React from "react";
import { setAmbientTrack, playUISound } from "../../../src/audio/audioEngine";
import VolumeSlider from "./VolumeSlider";
import "./AmbientPlayer.css";

const TRACKS = [
  { id: "focus",     label: "Focus",         icon: "◉", minTier: 0, desc: "Arctic drone — default" },
  { id: "rain",      label: "Rain",           icon: "⌁", minTier: 1, desc: "Heavy rainfall texture" },
  { id: "cyberpunk", label: "Cyberpunk City", icon: "⬡", minTier: 1, desc: "Night city hum" },
  { id: "deepspace", label: "Deep Space",     icon: "◎", minTier: 2, desc: "Cosmic low drone" },
];

const AmbientPlayer = ({ accountTier = 0, activeTrack = "focus", onTrackChange, addNotification }) => {
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
        <span className="ambient-label">AMBIENCE</span>
        <div className="ambient-vol-group">
          <span className="ambient-vol-icon">🔊</span>
          <VolumeSlider />
        </div>
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
              {locked && <span className="track-lock-tag">{t.minTier === 1 ? "PRO" : "ELITE"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AmbientPlayer;
