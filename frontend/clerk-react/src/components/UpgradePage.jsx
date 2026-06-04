import React from "react";
import "./UpgradePage.css";

const WEBSITE_URL = "https://zenithapp.org";

const TIERS = [
  {
    tier: 1,
    label: "PRO",
    color: "#22d3ee",
    tagline: "More capacity, faster progression",
    description: "Unlock 120-min sessions with Split, earn 1.5× XP and credits on every session, and drop loot twice as often.",
    price: "€4.99",
    perks: [
      { icon: "⌗", text: "Split — break any 120-min task into 4 × 30-min sessions" },
      { icon: "⬡", text: "Up to 15 active tasks at a time" },
      { icon: "⚡", text: "1.5× XP + credits on every completed session" },
      { icon: "◆", text: "50% loot drop rate — 2× more than FREE" },
      { icon: "◈", text: "Better Legendary and Mythic roll odds" },
      { icon: "♪", text: "Cobalt + Amber themes unlocked" },
    ],
  },
  {
    tier: 2,
    label: "ELITE",
    color: "#fbbf24",
    tagline: "The full Zenith experience — zero limits",
    description: "2× XP and credits on everything, the best loot odds in the game, and unlimited tasks. No caps, no ceilings.",
    price: "€9.99",
    perks: [
      { icon: "∞", text: "Unlimited active tasks" },
      { icon: "⚡", text: "2× XP + credits on every completed session" },
      { icon: "◆", text: "75% loot drop rate — 3× more than FREE" },
      { icon: "◈", text: "Best Legendary + Mythic roll odds in the game" },
      { icon: "♪", text: "All themes and ambient tracks unlocked" },
      { icon: "▲", text: "Priority beta access to new features" },
    ],
  },
];

const UpgradePage = ({ accountTier = 0, onBack }) => {
  const [selectedTier, setSelectedTier] = React.useState(accountTier === 1 ? 2 : 1);

  React.useEffect(() => {
    setSelectedTier(accountTier === 1 ? 2 : 1);
  }, [accountTier]);

  const activeTier = TIERS.find(tier => tier.tier === (accountTier >= 2 ? 2 : selectedTier));

  return (
    <div className="upgrade-page">

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
          {accountTier === 0 && "Pick a plan and unlock more capacity, faster XP, and better drop rates."}
          {accountTier === 1 && "Upgrade to Elite for 2× XP, 75% drop rate, and zero task limits."}
          {accountTier >= 2 && "Every feature is active. No limits, best drops, fastest progression."}
        </p>
      </div>

      {accountTier < 2 && (
        <div className="upgrade-tier-picker">
          {TIERS.map(tier => (
            <button
              key={tier.tier}
              className={`tier-pick-btn ${selectedTier === tier.tier ? "selected" : ""} ${accountTier >= tier.tier ? "current-tier" : ""}`}
              style={{ "--tier-color": tier.color }}
              onClick={() => setSelectedTier(tier.tier)}
              disabled={accountTier >= tier.tier}
            >
              <span className="tier-pick-label">{tier.label}</span>
              <span className="tier-pick-tagline">
                {accountTier >= tier.tier ? "Currently active" : tier.tagline}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="tier-details-container">
        {activeTier && (
          <div className="tier-detail-card" style={{ "--tier-color": activeTier.color }}>
            <p className="tier-detail-desc">{activeTier.description}</p>
            <ul className="tier-perk-list">
              {activeTier.perks.map((perk, index) => (
                <li key={index} className="tier-perk-item">
                  <span className="tier-perk-icon">{perk.icon}</span>
                  <span>{perk.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {accountTier < 2 && activeTier && (
        <div className="upgrade-cta-section">
          <div className="upgrade-cta-card" style={{ "--tier-color": activeTier.color }}>
            <div className="cta-left">
              <span className="cta-plan-label">{activeTier.label} PLAN</span>
              <span className="cta-plan-price">
                {activeTier.price}
                <span className="cta-plan-interval">/month</span>
              </span>
              <span className="cta-plan-note">
                Manage your subscription at zenithapp.org
              </span>
            </div>
            <a
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-initiate-btn"
            >
              Subscribe at zenithapp.org ↗
            </a>
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
