import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { useUserContext, useUIContext } from "../../../src/AppContext";
import { deleteAccount } from "../../../src/services/api";
import "./SettingsPage.css";
import "./AmbientPlayer.css";

const TIER_LABELS  = ["FREE", "PRO", "ELITE"];
const TIER_COLORS  = ["rgba(255,255,255,0.4)", "#22d3ee", "#fbbf24"];

const SettingsPage = () => {
  const { user, clerkUser, getRank } = useUserContext();
  const { atmosphereVolume, handleAtmosphereVolumeChange } = useUIContext();

  const navigate    = useNavigate();
  const { signOut } = useClerk();
  const level       = user?.level ?? 1;

  const [deleteStep,  setDeleteStep]  = useState(0); // 0=idle, 1=confirm, 2=deleting
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteAccount = async () => {
    setDeleteStep(2);
    setDeleteError(null);
    try {
      await deleteAccount();
      localStorage.removeItem("zenith_theme");
      localStorage.removeItem("zenith_audio");
      await signOut();
    } catch (err) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleteStep(1);
    }
  };
  const rank        = getRank(level);
  const accountTier = user?.role === "ADMIN" ? 2 : (user?.account_tier ?? 0);
  const tierLabel   = TIER_LABELS[Math.min(accountTier, 2)];
  const tierColor   = TIER_COLORS[Math.min(accountTier, 2)];
  const hour        = new Date().getHours();
  const isRedzone   = hour >= 0 && hour < 5;

  return (
    <div className="settings-page">
      {/* ── Header ── */}
      <div className="settings-header">
        <div className="settings-header-row">
          <button className="page-back-btn" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            ‹
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>
      </div>

      <div className="settings-grid">
        {/* ── Operator Profile ── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <span className="settings-card-icon">◎</span> Profile
          </div>

          <div className="settings-profile-block">
            <div className="settings-profile-row">
              <span className="settings-label">USERNAME</span>
              <span className="settings-value">{(user?.username ?? "UNKNOWN").toUpperCase()}</span>
            </div>
            <div className="settings-profile-row">
              <span className="settings-label">EMAIL</span>
              <span className="settings-value settings-value--dim">{clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}</span>
            </div>
            <div className="settings-profile-row">
              <span className="settings-label">RANK</span>
              <span className="settings-value">{rank} · LVL {level}</span>
            </div>
            <div className="settings-profile-row">
              <span className="settings-label">CURRENT PLAN</span>
              <span className="settings-value" style={{ color: tierColor }}>{tierLabel}</span>
            </div>
            <div className="settings-profile-row">
              <span className="settings-label">STREAK</span>
              <span className="settings-value">
                {user?.streak ?? 0} DAY{(user?.streak ?? 0) !== 1 ? "S" : ""}
                {(user?.streak ?? 0) > 0 && ` · x${(1 + (user?.streak ?? 0) * 0.05).toFixed(2)} XP`}
              </span>
            </div>
            <div className="settings-profile-row">
              <span className="settings-label">CREDITS</span>
              <span className="settings-value">{(user?.system_credits ?? 0).toLocaleString()} CR</span>
            </div>
          </div>

          <button className="settings-signout-btn" onClick={() => signOut()}>
            <span>⏻</span>
            <span>Sign Out</span>
          </button>
        </section>

        {/* ── Volume ── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <span className="settings-card-icon">♪</span> Audio Volume
          </div>
          <div className="settings-audio-wrap">
            <div className="ambient-atmos-row">
              <span className="atmos-label">ATMOSPHERE</span>
              <input
                className="atmos-slider"
                type="range" min={0} max={1} step={0.01}
                value={atmosphereVolume}
                onChange={(e) => handleAtmosphereVolumeChange(parseFloat(e.target.value))}
              />
              <span className="atmos-pct">{Math.round(atmosphereVolume * 100)}%</span>
            </div>
            <p className="settings-shop-hint">
              Themes and audio tracks are now in the <button className="settings-shop-link" onClick={() => navigate("/shop")}>Shop ›</button>
            </p>
          </div>
        </section>

        {/* ── Legal ── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <span className="settings-card-icon">◎</span> Legal
          </div>
          <div className="settings-legal-links">
            <button className="settings-legal-btn" onClick={() => navigate("/privacy")}>
              Privacy Policy
              <span className="settings-legal-arrow">›</span>
            </button>
            <button className="settings-legal-btn" onClick={() => navigate("/terms")}>
              Terms of Service
              <span className="settings-legal-arrow">›</span>
            </button>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="settings-card settings-danger-card">
          <div className="settings-card-title settings-danger-title">
            <span className="settings-card-icon">⚠</span> Danger Zone
          </div>
          <p className="settings-danger-desc">
            Permanently deletes your account, all task history, XP, inventory,
            and subscription data. This cannot be undone.
          </p>
          {deleteStep === 0 && (
            <button
              className="settings-delete-btn"
              onClick={() => setDeleteStep(1)}>
              Delete Account
            </button>
          )}
          {deleteStep === 1 && (
            <div className="settings-delete-confirm">
              <span className="settings-delete-warning">
                Are you sure? All data will be permanently erased.
              </span>
              {deleteError && (
                <span className="settings-delete-error">{deleteError}</span>
              )}
              <div className="settings-delete-actions">
                <button
                  className="settings-delete-cancel-btn"
                  onClick={() => { setDeleteStep(0); setDeleteError(null); }}>
                  Cancel
                </button>
                <button
                  className="settings-delete-confirm-btn"
                  onClick={handleDeleteAccount}>
                  Yes, delete everything
                </button>
              </div>
            </div>
          )}
          {deleteStep === 2 && (
            <span className="settings-delete-progress">Deleting account…</span>
          )}
        </section>

        {/* ── Guardian Logic info ── */}
        <section className="settings-card">
          <div className="settings-card-title">
            <span className="settings-card-icon">◎</span> Neural Clock
          </div>
          <div className="settings-guardian-block">
            <div className={`settings-guardian-status${isRedzone ? " active" : ""}`}>
              <span className="settings-guardian-dot" />
              <span>{isRedzone ? "Red Zone active · rewards halved until 7AM" : "Your rewards shift with the time of day"}</span>
            </div>
            <div className="settings-guardian-rows">
              <div className="settings-guardian-row">
                <span>12AM – 7AM</span>
                <span className="settings-guardian-val red">÷2 Rewards · Red Zone</span>
              </div>
              <div className="settings-guardian-row">
                <span>8AM – 11AM</span>
                <span className="settings-guardian-val green">Peak — best XP</span>
              </div>
              <div className="settings-guardian-row">
                <span>2PM – 4PM</span>
                <span className="settings-guardian-val yellow">Drag — reduced rewards</span>
              </div>
              <div className="settings-guardian-row">
                <span>10PM – 12AM</span>
                <span className="settings-guardian-val blue">Hyperfocus window</span>
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
};

export default SettingsPage;
