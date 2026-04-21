import React, { useState } from "react";
import { initiateCheckout } from "../../../src/stripeService.js";
import "./UpgradePage.css";

const TIERS = [
  {
    tier: 1,
    label: "PRO",
    color: "#22d3ee",
    tagline: "Makes your life easier",
    desc: "More perk slots, better ambient sounds, improved item luck, and 1.5× XP on everything you complete.",
    perks: [
      { icon: "◈", text: "1.5× XP on every completed task" },
      { icon: "▣", text: "2 perk slots — equip two items at once" },
      { icon: "♪", text: "Rain, Cyberpunk City, and Deep Space ambience" },
      { icon: "◆", text: "Better item drops — Rare and above much more common" },
      { icon: "⬡", text: "Up to 15 active tasks at a time" },
    ],
  },
  {
    tier: 2,
    label: "ELITE",
    color: "#a78bfa",
    tagline: "For the ultimate power user — zero limits",
    desc: "2× XP, 4 perk slots, every theme and ambient track, and the best possible loot. No task cap.",
    perks: [
      { icon: "◈", text: "2× XP on every completed task" },
      { icon: "▣", text: "4 perk slots — stack your best gear" },
      { icon: "♪", text: "All ambient tracks + all themes unlocked" },
      { icon: "◆", text: "Legendary and Mythic drops on a much shorter cooldown" },
      { icon: "∞", text: "Unlimited active tasks" },
    ],
  },
];

const UpgradePage = ({ accountTier = 0, clerkId, onBack, addNotification }) => {
  const [selectedTier, setSelectedTier] = useState(accountTier === 1 ? 2 : 1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const handleCheckout = async () => {
    if (!clerkId || isRedirecting) return;
    setCheckoutError(null);
    setIsRedirecting(true);
    try {
      await initiateCheckout(selectedTier, clerkId);
    } catch (err) {
      setIsRedirecting(false);
      setCheckoutError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="upgrade-page">

      {isRedirecting && (
        <div className="checkout-overlay" aria-live="polite">
          <div className="checkout-spinner" aria-hidden="true" />
          <span className="checkout-overlay-text">Processing System Upgrade...</span>
          <span className="checkout-overlay-sub">You'll be redirected to Stripe in a moment.</span>
        </div>
      )}
      <button className="upgrade-back-btn" onClick={onBack}>
        ← Back to Dashboard
      </button>

      <div className="upgrade-header">
        <span className="upgrade-eyebrow">YOUR PLAN</span>
        <h1 className="upgrade-title">
          {accountTier === 0 && "Level Up Your Zenith"}
          {accountTier === 1 && "You're on Pro"}
          {accountTier >= 2 && "You're on Elite"}
        </h1>
        <p className="upgrade-subtitle">
          {accountTier === 0 && "Pick a plan and instantly unlock better perks, more sounds, and higher XP — free during early access."}
          {accountTier === 1 && "Upgrade to Elite for 2× XP, 4 perk slots, and zero limits."}
          {accountTier >= 2 && "Every feature is active. No limits, best drops, maximum XP."}
        </p>
      </div>

      {accountTier < 2 && (
        <div className="upgrade-tier-picker">
          {TIERS.map((t) => (
            <button
              key={t.tier}
              className={`tier-pick-btn ${selectedTier === t.tier ? "selected" : ""} ${accountTier >= t.tier ? "current-tier" : ""}`}
              style={{ "--tier-color": t.color }}
              onClick={() => setSelectedTier(t.tier)}
              disabled={accountTier >= t.tier}
            >
              <span className="tier-pick-label">{t.label}</span>
              <span className="tier-pick-tagline">
                {accountTier >= t.tier ? "Currently active" : t.tagline}
              </span>
            </button>
          ))}
        </div>
      )}

      {TIERS.filter((t) => t.tier === (accountTier >= 2 ? 2 : selectedTier)).map((t) => (
        <div key={t.tier} className="tier-detail-card" style={{ "--tier-color": t.color }}>
          <p className="tier-detail-desc">{t.desc}</p>
          <ul className="tier-perk-list">
            {t.perks.map((p, i) => (
              <li key={i} className="tier-perk-item">
                <span className="tier-perk-icon">{p.icon}</span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {accountTier < 2 && (
        <div className="upgrade-cta-section">
          {checkoutError && (
            <div className="checkout-error-banner" role="alert">
              <span className="checkout-error-icon">⊗</span>
              <span>{checkoutError}</span>
              <button className="checkout-error-dismiss" onClick={() => setCheckoutError(null)}>✕</button>
            </div>
          )}
          <div className="upgrade-cta-card">
            <div className="cta-left">
              <span className="cta-plan-label">
                {TIERS.find((t) => t.tier === selectedTier)?.label} PLAN
              </span>
              <span className="cta-plan-price">
                {selectedTier === 1 ? "$9.99" : "$24.99"}
                <span className="cta-plan-interval">/mo</span>
              </span>
              <span className="cta-plan-note">
                Monthly subscription · Cancel anytime · Secure via Stripe
              </span>
            </div>
            <button
              className="cta-initiate-btn"
              onClick={handleCheckout}
              disabled={isRedirecting || accountTier >= selectedTier}
            >
              {isRedirecting
                ? "Redirecting..."
                : accountTier >= selectedTier
                ? "Already Active"
                : `Upgrade to ${TIERS.find((t) => t.tier === selectedTier)?.label}`}
            </button>
          </div>
        </div>
      )}

      {accountTier >= 2 && (
        <div className="upgrade-active-banner">
          <span className="active-banner-icon">◈</span>
          <span>You're on Elite — every feature is unlocked. No limits.</span>
        </div>
      )}
    </div>
  );
};

export default UpgradePage;
