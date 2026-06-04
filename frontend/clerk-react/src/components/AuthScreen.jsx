import React, { useState } from "react";
import { SignInButton, useAuth } from "@clerk/clerk-react";
import "./AuthScreen.css";

function getSolarPhase() {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return "morning";
  if (h >= 8  && h < 12) return "day";
  if (h >= 12 && h < 14) return "noon";
  if (h >= 14 && h < 17) return "day";
  if (h >= 17 && h < 19) return "evening";
  if (h >= 19 && h < 21) return "sunset";
  return "night";
}

const PHASE_ACCENT = {
  morning: "#ff9a9e",
  day:     "#22d3ee",
  noon:    "#fbbf24",
  evening: "#c084fc",
  sunset:  "#f97316",
  night:   "#22d3ee",
};

const TRUST_ITEMS = [
  { icon: "⚿", label: "End-to-end encrypted" },
  { icon: "◈", label: "Identity verified"     },
  { icon: "↻", label: "Persistent sync"       },
];

const AuthScreen = () => {
  const { isLoaded } = useAuth();
  const phase  = getSolarPhase();
  const accent = PHASE_ACCENT[phase] ?? "#22d3ee";
  const [loading, setLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        LOADING ZENITH ENGINE...
      </div>
    );
  }

  const handlePointerDown = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  };

  return (
    <div
      className={`auth-screen phase-${phase}`}
      style={{ "--ui-accent": accent }}
    >
      <div className="auth-vignette" />

      <div className="auth-card-wrap">
        <div className="auth-card-glass">

          {/* ── Wordmark ── */}
          <div className="auth-logo">
            <span className="auth-eyebrow">Neural Productivity System</span>
            <span className="auth-wordmark">ZENITH</span>
            <span className="auth-accent-line" />
            <span className="auth-version">v2.1</span>
          </div>

          {/* ── Separator ── */}
          <div className="auth-rule" />

          {/* ── Body copy ── */}
          <p className="auth-body">
            Your focus profile, active tasks, and XP are waiting exactly where you left them.
          </p>

          {/* ── CTA ── */}
          <div className="auth-cta-wrap">
            <SignInButton mode="modal">
              <button
                className={`auth-cta${loading ? " auth-cta--loading" : ""}`}
                onPointerDown={handlePointerDown}
              >
                {loading
                  ? <span className="auth-cta-spinner" aria-hidden="true" />
                  : "ACCESS SYSTEM"
                }
              </button>
            </SignInButton>
          </div>

          {/* ── Trust strip ── */}
          <div className="auth-trust">
            {TRUST_ITEMS.map((t, i) => (
              <React.Fragment key={t.label}>
                {i > 0 && <span className="auth-trust-sep" aria-hidden="true">·</span>}
                <span className="auth-trust-item">
                  <span className="auth-trust-icon" aria-hidden="true">{t.icon}</span>
                  {t.label}
                </span>
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
