import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useUserContext, useUIContext, useTaskContext } from "../../../src/AppContext";
import { fetchShopState, purchaseCosmetic, purchaseConsumable } from "../../../src/services/api";
import { COSMETICS } from "../utils/constants";
import { setAmbientTrack } from "../../../src/audio/audioEngine";
import "./ExchangePage.css";

const WEBSITE_URL = "https://zenithapp.org";

const TIER_DATA = [
  {
    tier: 1,
    label: "PRO",
    price: "€4.99",
    color: "#22d3ee",
    tagline: "More capacity, faster progression",
    perks: [
      { icon: "⌗", text: "Split — break 120-min tasks into 4 × 30-min sessions" },
      { icon: "⚡", text: "1.5× XP + credits on every completed session" },
      { icon: "◆", text: "50% loot drop rate — 2× more than FREE" },
      { icon: "◈", text: "120 CR daily bonus (vs 30 CR free)" },
      { icon: "♪", text: "Cobalt + Amber themes unlocked" },
    ],
  },
  {
    tier: 2,
    label: "ELITE",
    price: "€9.99",
    color: "#fbbf24",
    tagline: "The full Zenith experience — zero limits",
    perks: [
      { icon: "∞", text: "Unlimited active tasks" },
      { icon: "⚡", text: "2× XP + credits on every completed session" },
      { icon: "◆", text: "75% loot drop rate — 3× more than FREE" },
      { icon: "◈", text: "Best Legendary + Mythic roll odds in the game" },
      { icon: "◈", text: "250 CR daily bonus" },
      { icon: "♪", text: "All themes and ambient tracks unlocked" },
    ],
  },
];

const tierLabel = (type) => {
  if (type === "pro")   return "PRO";
  if (type === "elite") return "ELITE";
  return null;
};

const ExchangePage = () => {
  const { user, fetchUser } = useUserContext();
  const { activeTheme, setActiveTheme, activeAmbientTrack, setActiveAmbientTrack, playHaptic } = useUIContext();
  const { setLoot } = useTaskContext();
  const navigate     = useNavigate();
  const accountTier  = user?.account_tier ?? 0;
  const ownedRaw     = user?.purchased_cosmetics;

  const [activeTab,    setActiveTab]    = useState("shop");
  const [selectedTier, setSelectedTier] = useState(accountTier === 1 ? 2 : 1);
  const [shopCredits,  setShopCredits]  = useState(user?.system_credits ?? 0);
  const [owned,        setOwned]        = useState([]);
  const [buying,       setBuying]       = useState(null);
  const [buyingConsumable, setBuyingConsumable] = useState(null);
  const [streakRescued,   setStreakRescued]   = useState(false);
  const [feedback,     setFeedback]     = useState(null);
  const [preview,      setPreview]      = useState(null); // { id, label, type, color, price, originalTheme }
  const previewTimerRef = useRef(null);

  useEffect(() => {
    setShopCredits(user?.system_credits ?? 0);
    if (Array.isArray(ownedRaw)) setOwned(ownedRaw);
  }, [user?.system_credits, ownedRaw]);

  useEffect(() => {
    setSelectedTier(accountTier === 1 ? 2 : 1);
  }, [accountTier]);

  const isOwned = useCallback((id, type) => {
    if (type === "free")   return true;
    if (type === "pro")    return accountTier >= 1;
    if (type === "elite")  return accountTier >= 2;
    return owned.includes(id);
  }, [owned, accountTier]);

  const handleBuy = useCallback(async (id, price) => {
    if (buying) return;
    playHaptic?.("DEPLOY");
    setBuying(id);
    setFeedback(null);
    try {
      const res = await purchaseCosmetic(id);
      setShopCredits(res.data.system_credits);
      setOwned(res.data.owned ?? []);
      setFeedback({ type: "success", msg: "Unlocked! Apply it now." });
      fetchUser();
    } catch (err) {
      let msg = err.message;
      if (msg.includes("INSUFFICIENT")) msg = "Not enough credits";
      if (msg.includes("ALREADY_OWNED")) msg = "Already unlocked";
      setFeedback({ type: "error", msg });
    } finally {
      setBuying(null);
    }
  }, [buying, fetchUser, playHaptic]);

  const handleBuyConsumable = useCallback(async (id, price) => {
    if (buyingConsumable || shopCredits < price) return;
    playHaptic?.("DEPLOY");
    setBuyingConsumable(id);
    setFeedback(null);
    try {
      const res = await purchaseConsumable(id);
      setShopCredits(res.data.system_credits);
      fetchUser();
      if (id === "streak_rescue") {
        // Show a dedicated in-page confirmation so it's unmissable
        setStreakRescued(true);
        setTimeout(() => setStreakRescued(false), 5000);
      } else {
        // Fire the real LootDisplay cinematic — same as earning a drop from a session
        const drop = { rarity: res.data.rarity ?? "Junk", credits_earned: res.data.credits_earned ?? 0 };
        setLoot(drop);
      }
    } catch (err) {
      let msg = err.response?.data?.message || err.message || "Purchase failed";
      if (err.response?.data?.error === "INSUFFICIENT_CREDITS") msg = "Not enough credits";
      if (err.response?.data?.error === "STREAK_NOT_BROKEN")    msg = "Your streak is still active — nothing to rescue";
      setFeedback({ type: "error", msg });
    } finally {
      setBuyingConsumable(null);
    }
  }, [buyingConsumable, shopCredits, fetchUser, playHaptic, setLoot]);

  const handleApplyTheme = useCallback((id) => {
    playHaptic?.("TICK");
    setActiveTheme(id);
    setFeedback({ type: "success", msg: "Theme applied." });
  }, [setActiveTheme, playHaptic]);

  const handleApplyAudio = useCallback((id) => {
    playHaptic?.("TICK");
    setActiveAmbientTrack(id);
    setAmbientTrack(id);
    setFeedback({ type: "success", msg: "Audio track applied." });
  }, [setActiveAmbientTrack, playHaptic]);

  const PREVIEW_MS = 20_000;

  // Refs hold the pre-preview originals so the unmount cleanup can always revert,
  // even if the component is gone (navigation, logout, tab switch).
  const originalThemeRef = useRef(null);
  const originalAudioRef = useRef(null);

  const stopPreview = useCallback(() => {
    clearTimeout(previewTimerRef.current);
    if (originalThemeRef.current) {
      setActiveTheme(originalThemeRef.current);
      originalThemeRef.current = null;
    }
    if (originalAudioRef.current) {
      setAmbientTrack(originalAudioRef.current);
      originalAudioRef.current = null;
    }
    setPreview(null);
  }, [setActiveTheme]);

  const startPreview = useCallback((item, kind) => {
    clearTimeout(previewTimerRef.current);

    if (kind === "theme") {
      // Only capture the very first original (don't overwrite if switching previews)
      if (!originalThemeRef.current) originalThemeRef.current = activeTheme;
      setActiveTheme(item.id);
    } else {
      if (!originalAudioRef.current) {
        originalAudioRef.current = localStorage.getItem("zenith_audio") || "focus";
      }
      setAmbientTrack(item.id);
    }

    const bannerColor =
      item.color ??
      (item.type === "pro" ? "#22d3ee" : item.type === "elite" ? "#fbbf24" : "#fdba74");

    setPreview({ id: item.id, label: item.label, type: item.type, price: item.price, kind, color: bannerColor });
    playHaptic?.("TICK");
    previewTimerRef.current = setTimeout(stopPreview, PREVIEW_MS);
  }, [activeTheme, setActiveTheme, playHaptic, stopPreview]);

  // Revert on unmount — fires regardless of how the user left (nav, logout, back button)
  useEffect(() => {
    return () => {
      clearTimeout(previewTimerRef.current);
      if (originalThemeRef.current) setActiveTheme(originalThemeRef.current);
      if (originalAudioRef.current) setAmbientTrack(originalAudioRef.current);
    };
  }, [setActiveTheme]);

  const selectedTierData = TIER_DATA.find(t => t.tier === selectedTier);

  const renderCosmetic = (item, isTheme) => {
    const owned       = isOwned(item.id, item.type);
    const isActive    = isTheme ? activeTheme === item.id : activeAmbientTrack === item.id;
    const isBuying    = buying === item.id;
    const canBuy      = !owned && item.type === "credits" && shopCredits >= item.price;
    const tierTag     = tierLabel(item.type);
    const tierColor   = item.type === "pro" ? "#22d3ee" : "#fbbf24";
    const kind         = isTheme ? "theme" : "audio";
    const isPreviewing = preview?.id === item.id && preview?.kind === kind;

    return (
      <div
        key={item.id}
        className={`cosm-item${isActive ? " cosm-active" : ""}${owned ? " cosm-owned" : ""}${item.type === "pro" ? " cosm-pro" : item.type === "elite" ? " cosm-elite" : ""}${isPreviewing ? " cosm-previewing" : ""}`}
        style={{ "--cosm-color": isTheme ? item.color : (isPreviewing ? (item.type === "elite" ? "#fbbf24" : item.type === "pro" ? "#22d3ee" : "#fdba74") : undefined) }}
      >
        {isTheme ? (
          <div className="cosm-swatch" style={{ background: item.color }} />
        ) : (
          <span className="cosm-audio-icon">{item.icon}</span>
        )}

        <div className="cosm-info">
          <span className="cosm-label">{item.label}</span>
          {!isTheme && item.desc && <span className="cosm-desc">{item.desc}</span>}
        </div>

        <div className="cosm-action">
          {tierTag && !owned && !isPreviewing && (
            <span className="cosm-tier-tag" style={{ color: tierColor, borderColor: tierColor }}>
              {tierTag}
            </span>
          )}
          {owned && !isActive && (
            <button
              className="cosm-btn cosm-btn--apply"
              onClick={() => isTheme ? handleApplyTheme(item.id) : handleApplyAudio(item.id)}
            >
              Apply
            </button>
          )}
          {owned && isActive && (
            <span className="cosm-active-tag">Active</span>
          )}
          {!owned && !isPreviewing && (
            <button
              className="cosm-btn cosm-btn--preview"
              onClick={() => startPreview(item, kind)}
            >
              Preview
            </button>
          )}
          {!owned && isPreviewing && (
            <span className="cosm-active-tag cosm-previewing-tag">Live</span>
          )}
          {!owned && item.type === "credits" && (
            <button
              className={`cosm-btn cosm-btn--buy${canBuy ? " can-buy" : ""}`}
              disabled={!canBuy || !!buying}
              onClick={() => canBuy && handleBuy(item.id, item.price)}
            >
              {isBuying ? "···" : `${item.price} CR`}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="exchange-page">
      <div className="exchange-header">
        <button className="page-back-btn" onClick={() => navigate("/dashboard")} aria-label="Back">‹</button>
        <h1 className="exchange-title">{activeTab === "shop" ? "Shop" : "Upgrade"}</h1>
        <span className="exchange-credits">◈ {shopCredits.toLocaleString()} CR</span>
      </div>

      <div className="exchange-body">
        <div className="exchange-tabs" role="tablist">
          <button
            className={`exchange-tab-btn${activeTab === "shop" ? " active" : ""}`}
            onClick={() => setActiveTab("shop")}
            role="tab" aria-selected={activeTab === "shop"}>
            <span className="exchange-tab-icon">◆</span> Shop
          </button>
          <button
            className={`exchange-tab-btn${activeTab === "upgrade" ? " active" : ""}`}
            onClick={() => setActiveTab("upgrade")}
            role="tab" aria-selected={activeTab === "upgrade"}>
            <span className="exchange-tab-icon">▲</span> Upgrade
          </button>
        </div>

        {feedback && (
          <div className={`exchange-feedback exchange-feedback--${feedback.type}`}>
            {feedback.msg}
          </div>
        )}

        {/* ── Shop panel ── */}
        <div className="exchange-panel" role="tabpanel" style={{ display: activeTab === "shop" ? "flex" : "none" }}>

          <div className="cosm-section-title">
            <span className="cosm-section-icon">◆</span> Themes
            <span className="cosm-section-note">Basic themes buyable with credits · PRO/ELITE unlock exclusive ones</span>
          </div>
          <div className="cosm-grid">
            {COSMETICS.themes.map(t => renderCosmetic(t, true))}
          </div>

          <div className="cosm-section-title" style={{ marginTop: "20px" }}>
            <span className="cosm-section-icon">♪</span> Ambient Audio
            <span className="cosm-section-note">Focus is always free · unlock more with credits or a subscription</span>
          </div>
          <div className="cosm-grid cosm-grid--audio">
            {COSMETICS.audio.map(t => renderCosmetic(t, false))}
          </div>

          <div className="cosm-section-title" style={{ marginTop: "20px" }}>
            <span className="cosm-section-icon">◬</span> Consumables
            <span className="cosm-section-note">One-time use · effect applied immediately on purchase</span>
          </div>
          {streakRescued && (
            <div className="streak-rescued-banner">
              <span className="srb-icon">🔥</span>
              <div className="srb-text">
                <span className="srb-title">Streak rescued</span>
                <span className="srb-sub">Your streak is back to 1. Don't break it again.</span>
              </div>
            </div>
          )}

          <div className="cosm-grid cosm-grid--consumables">
            {COSMETICS.consumables.map(item => {
              const isBuying  = buyingConsumable === item.id;
              const canAfford = shopCredits >= item.price;
              return (
                <div key={item.id} className="cosm-item cosm-consumable">
                  <span className="cosm-audio-icon">{item.icon}</span>
                  <div className="cosm-info">
                    <span className="cosm-label">{item.label}</span>
                    <span className="cosm-desc">{item.desc}</span>
                  </div>
                  <div className="cosm-action">
                    <button
                      className={`cosm-btn cosm-btn--buy${canAfford ? " can-buy" : ""}`}
                      disabled={!canAfford || !!buyingConsumable}
                      onClick={() => canAfford && handleBuyConsumable(item.id, item.price)}
                    >
                      {isBuying ? "···" : `${item.price} CR`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Upgrade panel ── */}
        <div className="exchange-panel" role="tabpanel" style={{ display: activeTab === "upgrade" ? "flex" : "none" }}>
          <div className="exchange-section-title">
            <span className="exchange-section-icon">▲</span> Upgrade Plan
          </div>

          {accountTier >= 2 ? (
            <div className="exchange-maxed">
              <span className="exchange-maxed-icon">◆</span>
              <span className="exchange-maxed-title">You're on Elite</span>
              <span className="exchange-maxed-sub">Every feature is unlocked.</span>
            </div>
          ) : (
            <>
              <div className="exchange-tier-picker">
                {TIER_DATA.map(t => (
                  <button
                    key={t.tier}
                    className={`exchange-tier-btn${selectedTier === t.tier ? " selected" : ""}${accountTier >= t.tier ? " current" : ""}`}
                    style={{ "--tier-color": t.color }}
                    onClick={() => setSelectedTier(t.tier)}
                    disabled={accountTier >= t.tier}>
                    <span className="exchange-tier-label">{t.label}</span>
                    <span className="exchange-tier-tagline">
                      {accountTier >= t.tier ? "Active" : t.tagline}
                    </span>
                    {accountTier < t.tier && (
                      <span className="exchange-tier-price" style={{ color: t.color }}>
                        {t.price}<span className="exchange-tier-period">/month</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="exchange-checkout-wrap">
                <a
                  href={WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="exchange-checkout-btn"
                  style={{ "--tier-color": selectedTierData?.color }}>
                  <span className="exchange-checkout-label">Subscribe at zenithapp.org ↗</span>
                  <span className="exchange-checkout-price">{selectedTierData?.price}/month</span>
                </a>
              </div>

              {selectedTierData && (
                <div className="exchange-tier-card" style={{ "--tier-color": selectedTierData.color }}>
                  <ul className="exchange-tier-perks">
                    {selectedTierData.perks.map((p, i) => (
                      <li key={i} className="exchange-tier-perk">
                        <span className="exchange-tier-perk-icon">{p.icon}</span>
                        <span>{p.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* ── Theme preview banner — portalled so it sits above the shell ── */}
    {preview && createPortal(
      <div
        className="theme-preview-banner"
        style={{ "--preview-color": preview.color }}
      >
        <div className="tpb-drain" style={{ animationDuration: `${PREVIEW_MS}ms` }} />
        <button className="tpb-back" onClick={stopPreview} aria-label="Stop preview">
          ← Back
        </button>
        <div className="tpb-center">
          <span className="tpb-label">{preview.kind === "audio" ? "Listening to" : "Previewing"}</span>
          <span className="tpb-name">{preview.label.toUpperCase()}</span>
        </div>
        {preview.type === "credits" ? (
          <button
            className="tpb-cta"
            onClick={() => { stopPreview(); handleBuy(preview.id, preview.price); }}
          >
            Buy {preview.price} CR
          </button>
        ) : (
          <button
            className="tpb-cta"
            onClick={() => { stopPreview(); setActiveTab("upgrade"); setSelectedTier(preview.type === "pro" ? 1 : 2); }}
          >
            Get {preview.type === "pro" ? "PRO" : "ELITE"} ↗
          </button>
        )}
      </div>,
      document.body
    )}
    </>
  );
};

export default ExchangePage;
