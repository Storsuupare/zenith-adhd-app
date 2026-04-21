import React, { useState } from "react";

const InventoryItem = ({ inventory = [], onScrap, onEquip, playHaptic, onShopOpen, isOpen, onToggle, accountTier = 0, onUpgrade }) => {
  const [expandedItemId, setExpandedItemId] = useState(null);

  const toggleDetails = (id) => {
    setExpandedItemId((prev) => (String(prev) === String(id) ? null : id));
  };

  return (
    <div className="zenith-inventory-system">
      <nav className="inventory-nav-bar">
        {onShopOpen && (
          <button className="nav-btn shop-nav-btn" onClick={() => { playHaptic?.("PRESTIGE_EQUIP"); onShopOpen(); }}>
            <span className="btn-content">
              <span className="shop-nav-icon">◈</span>
              <span className="btn-label">Shop</span>
            </span>
          </button>
        )}
        <div className="nav-divider"></div>
        {onUpgrade && (
          <button
            className={`nav-btn upgrade-nav-btn ${accountTier > 0 ? "optimized" : "required"}`}
            onClick={onUpgrade}
          >
            <span className="btn-content">
              <span className="shop-nav-icon">{accountTier > 0 ? "◆" : "▲"}</span>
              <span className="btn-label">UPGRADE</span>
            </span>
          </button>
        )}
        <div className="nav-divider"></div>
        <button
          className={`nav-btn ${isOpen ? "active" : ""}`}
          onClick={() => {
            if (!isOpen) playHaptic?.("VAULT_OPEN");
            onToggle?.();
          }}>
          <span className="btn-content">
            <span className="shop-nav-icon">{isOpen ? "▣" : "▤"}</span>
            <span className="btn-label">{isOpen ? "Close Bag" : "Open Bag"}</span>
            <span className="item-count">({inventory.length})</span>
          </span>
        </button>
      </nav>

      {isOpen && (
        <div className="inventory-vault-overlay">
          <div className="vault-grid">
            {inventory.length > 0 ? (
              inventory.map((item) => {
                const isExpanded = String(expandedItemId) === String(item.instanceId);
                return (
                  <div
                    key={item.instanceId}
                    className={`inventory-card rarity-${item.rarity.toLowerCase()} ${isExpanded ? "expanded" : ""}`}
                    style={{ "--rarity-color": item.color_hex }}>

                    <div className="item-header">
                      <span className="name" style={{ color: item.color_hex }}>
                        {item.name}
                      </span>
                      <div className="item-header-row">
                        <span className="rarity-tag">{item.rarity}</span>
                        <button
                          className={`info-toggle ${isExpanded ? "open" : ""}`}
                          onClick={() => toggleDetails(item.instanceId)}>
                          {isExpanded ? "HIDE" : "INFO"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="item-description-layer">
                        <span
                          className="description-header"
                          style={{ color: item.color_hex || item.colorHex }}>
                          About
                        </span>
                        <p className="lore-text">
                          {item.description || "No description available."}
                        </p>
                        <div className="effect-badge">
                          <span className="effect-label">EFFECT</span>
                          <span className="effect-value">
                            {item.effectValue || item.effect_value || "Passive"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="item-actions">
                      {item.rarity.toLowerCase() === "junk" ? (
                        <button
                          onClick={() => onScrap(item.instanceId)}
                          className="scrap-btn">
                          Recycle (+90 XP)
                        </button>
                      ) : (
                        <button
                          onClick={() => onEquip(item)}
                          className={`equip-btn ${item.is_equipped ? "active" : ""}`}>
                          {item.is_equipped ? "Equipped ✓" : "Equip"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-vault-notice">
                <p>Your bag is empty! Finish a session to earn drops!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryItem;
