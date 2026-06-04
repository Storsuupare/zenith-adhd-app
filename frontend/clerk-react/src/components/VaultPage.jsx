import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext, useUIContext } from "../../../src/AppContext";
import { PERK_EFFECT_HINTS } from "../utils/constants";
import "./VaultPage.css";

const RARITY_ORDER = { Mythic: 0, Legendary: 1, Epic: 2, Rare: 3, Uncommon: 4, Common: 5, Junk: 6 };

const TIER_SLOT_COUNTS = [1, 2, 4];

const VaultPage = () => {
  const { user, inventory, handleInventoryEquip, addNotification } = useUserContext();
  const { playHaptic } = useUIContext();
  const navigate = useNavigate();

  const [expandedId, setExpandedId] = useState(null);
  const [filter,     setFilter]     = useState("ALL");

  const accountTier  = user?.role === "ADMIN" ? 2 : (user?.account_tier ?? 0);
  const maxSlots     = TIER_SLOT_COUNTS[Math.min(accountTier, 2)];
  const equippedCount = inventory.filter(i => i.is_equipped).length;

  const rarities = ["ALL", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];
  const filtered = [...inventory]
    .filter(i => filter === "ALL" || i.rarity === filter)
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9));

  return (
    <div className="vault-page">
      {/* ── Header ── */}
      <div className="vault-header">
        <div className="vault-header-left">
          <span className="vault-eyebrow">▣ Inventory</span>
          <h1 className="vault-title">Your Perks</h1>
          <p className="vault-sub">
            {inventory.length} items · {equippedCount}/{maxSlots} slots active
          </p>
        </div>

      </div>

      {/* ── Loadout bar ── */}
      <div className="vault-loadout-bar">
        <span className="vault-loadout-label">Equipped</span>
        <div className="vault-loadout-slots">
          {Array.from({ length: maxSlots }).map((_, i) => {
            const perk = inventory.filter(it => it.is_equipped)[i];
            return (
              <div
                key={i}
                className={`vault-slot${perk ? " vault-slot--filled" : " vault-slot--empty"}`}
                style={perk ? { "--slot-color": perk.color_hex } : {}}
              >
                {perk ? (
                  <>
                    <span className="vault-slot-dot" />
                    <div className="vault-slot-info">
                      <span className="vault-slot-name">{perk.name}</span>
                      <span className="vault-slot-rarity" style={{ color: perk.color_hex }}>
                        {perk.rarity}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="vault-slot-empty-text">Empty slot</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Rarity filter ── */}
      <div className="vault-filter-bar">
        {rarities.map(r => (
          <button
            key={r}
            className={`vault-filter-btn${filter === r ? " active" : ""}`}
            onClick={() => setFilter(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Item grid ── */}
      {filtered.length === 0 ? (
        <div className="vault-empty">
          <span className="vault-empty-icon">▣</span>
          <span className="vault-empty-title">Nothing here yet</span>
          <span className="vault-empty-sub">Complete tasks to earn loot drops</span>
          <button
            className="vault-empty-cta"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="vault-grid">
          {filtered.map(item => {
            const isExpanded = String(expandedId) === String(item.instanceId);
            const isEquipped = item.is_equipped;
            const hint       = PERK_EFFECT_HINTS[item.name] ?? item.effect_value ?? "Active";

            return (
              <div
                key={item.instanceId}
                className={`vault-card rarity-${item.rarity.toLowerCase()}${isEquipped ? " vault-card--equipped" : ""}${isExpanded ? " vault-card--expanded" : ""}`}
                style={{ "--rarity-color": item.color_hex }}
              >
                {/* Shimmer glare */}
                <div className="vault-card-glare" />

                <div className="vault-card-top">
                  <div className="vault-card-name-row">
                    <span className="vault-card-rarity-dot" style={{ background: item.color_hex }} />
                    <span className="vault-card-name" style={{ color: item.color_hex }}>
                      {item.name}
                    </span>
                  </div>
                  <div className="vault-card-meta-row">
                    <span className="vault-card-rarity-tag">{item.rarity}</span>
                    {isEquipped && <span className="vault-card-equipped-badge">Equipped</span>}
                  </div>
                </div>

                <div className="vault-card-effect">
                  <span className="vault-card-effect-icon">◈</span>
                  <span className="vault-card-effect-text">{hint}</span>
                </div>

                {isExpanded && (
                  <p className="vault-card-description">{item.description}</p>
                )}

                <div className="vault-card-actions">
                  <button
                    className="vault-card-info-btn"
                    onClick={() => setExpandedId(isExpanded ? null : item.instanceId)}
                  >
                    {isExpanded ? "Hide" : "Info"}
                  </button>
                  <button
                    className={`vault-card-equip-btn${isEquipped ? " unequip" : ""}`}
                    onClick={() => {
                      playHaptic?.(isEquipped ? "HISS" : "PRESTIGE_EQUIP");
                      handleInventoryEquip(item);
                    }}
                  >
                    {isEquipped ? "Unequip" : "Equip"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VaultPage;
