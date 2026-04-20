import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./ShopModal.css";

const ICONS = {
  bandwidth_injector: "◈",
  neural_buffer:      "⬡",
  kernel_optimizer:   "▣",
};

const ShopModal = ({ clerkId, isOpen, onClose, onPurchaseComplete, playHaptic }) => {
  const [catalog,  setCatalog]  = useState([]);
  const [credits,  setCredits]  = useState(0);
  const [buying,   setBuying]   = useState(null);   // item_id being processed
  const [feedback, setFeedback] = useState(null);   // { type, msg }

  useEffect(() => {
    if (!isOpen || !clerkId) return;
    setFeedback(null);

    Promise.all([
      fetch("http://localhost:8000/system/shop/catalog").then((r) => r.json()),
      fetch(`http://localhost:8000/system/profile/${clerkId}`).then((r) => r.json()),
    ])
      .then(([shopData, profileData]) => {
        setCatalog(shopData.items || []);
        setCredits(profileData.system_credits ?? 0);
      })
      .catch((err) => console.warn("[SHOP] Load failed:", err.message));
  }, [isOpen, clerkId]);

  const handlePurchase = async (itemId) => {
    if (buying) return;
    playHaptic?.("DEPLOY");
    setBuying(itemId);
    setFeedback(null);

    try {
      const res = await fetch("http://localhost:8000/system/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_id: clerkId, item_id: itemId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          msg: res.status === 402 ? "INSUFFICIENT CREDITS" : (data.detail || "TRANSACTION FAILED"),
        });
        return;
      }

      setCredits(data.system_state.system_credits);
      setFeedback({ type: "success", msg: `${data.item_purchased} DEPLOYED` });
      onPurchaseComplete();
    } catch (err) {
      setFeedback({ type: "error", msg: "CONNECTION ERROR" });
    } finally {
      setBuying(null);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="shop-backdrop" onClick={handleBackdropClick}>
      <div className="shop-panel">

        {/* ── Header ── */}
        <header className="shop-header">
          <div className="shop-title-group">
            <span className="shop-prefix">◈</span>
            <h2 className="shop-title">ZENITH SHOP</h2>
          </div>
          <div className="shop-balance">
            <span className="shop-balance-value">{credits.toLocaleString()}</span>
            <span className="shop-balance-label">CREDITS AVAILABLE</span>
          </div>
          <button className="shop-close-btn" onClick={onClose} aria-label="Close shop">×</button>
        </header>

        {/* ── Feedback banner ── */}
        {feedback && (
          <div className={`shop-feedback shop-feedback--${feedback.type}`}>
            {feedback.msg}
          </div>
        )}

        {/* ── Item list ── */}
        <div className="shop-items">
          {catalog.map((item) => {
            const canAfford = credits >= item.cost;
            const isLoading = buying === item.id;

            return (
              <div
                key={item.id}
                className={`shop-item ${!canAfford ? "shop-item--locked" : ""}`}
              >
                <div className={`shop-item-icon shop-tier-icon--${item.tier?.toLowerCase()}`}>
                  {ICONS[item.id] || "◉"}
                </div>

                <div className="shop-item-body">
                  <div className="shop-item-top-row">
                    <span className="shop-item-name">{item.name}</span>
                    <span className={`shop-tier-badge shop-tier-badge--${item.tier?.toLowerCase()}`}>
                      {item.tier}
                    </span>
                  </div>
                  <span className="shop-item-effect">{item.effect_desc}</span>
                </div>

                <div className="shop-item-action">
                  <span className="shop-item-cost">
                    {item.cost.toLocaleString()}
                    <span className="shop-cost-unit"> CR</span>
                  </span>
                  <button
                    className={`shop-buy-btn ${!canAfford ? "shop-buy-btn--locked" : ""}`}
                    disabled={!canAfford || !!buying}
                    onClick={() => handlePurchase(item.id)}
                  >
                    {isLoading ? "···" : canAfford ? "ACQUIRE" : "LOCKED"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="shop-footer">
          <span className="shop-footer-text">ZENITH RESOURCE MARKET // SECURE CHANNEL</span>
        </footer>

      </div>
    </div>,
    document.body
  );
};

export default ShopModal;
