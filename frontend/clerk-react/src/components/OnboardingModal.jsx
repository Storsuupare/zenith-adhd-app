import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./OnboardingModal.css";

const PAD = 10;

// navigateTo — route to navigate to before this step
// placement  — "above" forces card above the target regardless of position
const STEPS = [
  {
    id: "welcome",
    target: null,
    icon: "⬡",
    title: "Welcome to Zenith",
    body: "Turn what you're already doing into a game. Every session earns XP and Credits. Stay consistent and the rewards compound — your streak multiplies everything.",
  },
  {
    id: "stathud",
    target: ".stat-hud-container",
    icon: "◈",
    title: "Your stats",
    body: "Level, XP, streak, and credits — all up here. Credits are earned by completing sessions and used in the Shop. Your streak multiplier stacks every day you show up.",
  },
  {
    id: "missions",
    target: ".mission-form-container",
    placement: "above",
    icon: "▣",
    title: "Start a session",
    body: "Name what you're working on, pick a duration, and hit go. Longer sessions pay out more XP and Credits. Finish what you start — quitting early cuts your reward.",
  },
  {
    id: "contracts",
    target: ".logs-section",
    icon: "◆",
    title: "Your active sessions",
    body: "Running sessions show up here with a live timer. Hit Done when you're finished. When you complete one you might get a loot drop — a credit bonus based on rarity.",
  },
  {
    id: "skills",
    target: ".skill-sidebar-container",
    icon: "⬢",
    title: "12 skills to grow",
    body: "Each session levels up one skill based on what you typed — Focus, Creativity, Logic, and more. Hit level 99 to Prestige: reset the skill but keep a permanent XP bonus.",
  },
  {
    id: "shop",
    target: null,
    noDim: true,
    cardPosition: "bottom",
    navigateTo: "/shop",
    icon: "◈",
    title: "The shop",
    body: "Spend your credits on themes and ambient audio tracks. Themes change the entire sky — from cosmic Nebula to cyberpunk Neon. PRO and ELITE unlock the full catalog.",
  },
  {
    id: "guardian",
    target: ".settings-guardian-block",
    navigateTo: "/settings",
    icon: "▲",
    title: "Neural Clock",
    body: "Your rewards shift with the time of day. Late nights (12AM–7AM) pay half — rest is part of the system. Your sharpest hours (8–11AM) give peak XP. The 10PM–12AM window is your hyperfocus zone.",
  },
  {
    id: "done",
    target: null,
    icon: "◌",
    title: "You're set.",
    body: "Pick something to work on and start your first session. The rest you'll figure out as you go — just start.",
  },
];

const obKey = (userId) => `zenith_onboarded_${userId}`;
export const markOnboarded = (userId) => localStorage.setItem(obKey(userId), "1");
export const isOnboarded   = (userId) => !!localStorage.getItem(obKey(userId));

export default function OnboardingModal({ onClose, userId, onNavigate }) {
  const [step,      setStep]      = useState(0);
  const [spotlight, setSpotlight] = useState(null);
  const [tipPos,    setTipPos]    = useState(null);
  const [cardKey,   setCardKey]   = useState(0);
  const rafRef   = useRef(null);
  const timerRef = useRef(null);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (current.navigateTo) {
      onNavigate?.(current.navigateTo);
    }

    if (!current.target) {
      setSpotlight(null);
      setTipPos(null);
      return;
    }

    const measure = () => {
      rafRef.current = requestAnimationFrame(() => {
        const el = document.querySelector(current.target);
        if (!el) { setSpotlight(null); setTipPos(null); return; }

        el.scrollIntoView({ behavior: "instant", block: "nearest" });

        rafRef.current = requestAnimationFrame(() => {
          const r  = el.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          if (r.bottom < 0 || r.top > vh) { setSpotlight(null); setTipPos(null); return; }

          setSpotlight({
            top:    r.top    - PAD,
            left:   r.left   - PAD,
            width:  r.width  + PAD * 2,
            height: r.height + PAD * 2,
          });

          const CARD_H = 250;
          const cardW  = Math.min(340, vw - 32);
          const tipL   = Math.max(16, Math.min(r.left + r.width / 2 - cardW / 2, vw - cardW - 16));
          const midY   = r.top + r.height / 2;

          const placeAbove = current.placement === "above" || midY >= vh * 0.55;

          if (!placeAbove) {
            const top = Math.min(r.bottom + PAD + 14, vh - CARD_H - 12);
            setTipPos({ top: Math.max(top, 12), left: tipL, width: cardW });
          } else {
            const bottom = Math.min(vh - r.top + PAD + 14, vh - CARD_H - 12);
            setTipPos({ bottom: Math.max(bottom, 12), left: tipL, width: cardW });
          }
        });
      });
    };

    if (current.navigateTo) {
      timerRef.current = setTimeout(measure, 450);
    } else {
      measure();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [step]);

  const advance = () => {
    if (isLast) { markOnboarded(userId); onNavigate?.("/dashboard"); onClose(); return; }
    setStep(s => s + 1);
    setCardKey(k => k + 1);
  };

  const skip = () => { markOnboarded(userId); onNavigate?.("/dashboard"); onClose(); };

  const handleKeyDown = (e) => {
    if (e.key === "Escape")                skip();
    if (e.key === "Enter" || e.key === " ") advance();
  };

  const hasSpotlight = spotlight && tipPos;
  const cardW = Math.min(360, window.innerWidth - 32);

  const wrapStyle = hasSpotlight
    ? { position: "fixed", zIndex: 9003, ...tipPos }
    : current.cardPosition === "bottom"
      ? { position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", width: cardW, zIndex: 9003 }
      : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardW, zIndex: 9003 };

  return createPortal(
    <div
      className="ob-root"
      role="dialog"
      aria-modal="true"
      aria-label="Getting started"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {hasSpotlight ? (
        <div
          className="ob-spotlight"
          style={{
            top:    spotlight.top,
            left:   spotlight.left,
            width:  spotlight.width,
            height: spotlight.height,
          }}
        />
      ) : !current.noDim ? (
        <div className="ob-dim" />
      ) : null}

      <div style={wrapStyle}>
        <div className="ob-card" key={cardKey}>

          <button className="ob-skip" onClick={skip} aria-label="Skip intro">
            Skip
          </button>

          <div className="ob-icon-wrap">
            <span className="ob-icon" aria-hidden="true">{current.icon}</span>
          </div>

          <h2 className="ob-title">{current.title}</h2>
          <p className="ob-body">{current.body}</p>

          <div className="ob-footer">
            <div className="ob-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`ob-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <button className="ob-next" onClick={advance} autoFocus>
              {isLast ? "Let's go" : "Next →"}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
