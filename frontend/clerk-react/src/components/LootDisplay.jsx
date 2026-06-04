import React from "react";

const LootDisplay = ({ loot, isOpening, onDismiss }) => {
  // ── Scanning / loading state ─────────────────────────────────
  if (isOpening && !loot) {
    return (
      <div className="loot-overlay">
        <div className="scan-stage">
          <div className="scan-sweep" aria-hidden="true" />
          <div className="scan-readout">
            <span className="scan-line-text scan-l1">SIGNAL DETECTED</span>
            <span className="scan-line-text scan-l2">ANALYZING DROP TABLE</span>
            <span className="scan-line-text scan-l3">RARITY · · ·</span>
          </div>
        </div>
      </div>
    );
  }

  if (!loot) return null;

  const rarity       = (loot.rarity ?? "junk").toLowerCase();
  const isHighRarity = rarity === "legendary" || rarity === "mythic";

  return (
    <div className={`loot-overlay${isHighRarity ? " high-rarity-drop" : ""}`}>
      {isHighRarity && (
        <div className={`loot-screen-flash rarity-flash-${rarity}`} aria-hidden="true" />
      )}
      <div className={`artifact-card rarity-${rarity}`} data-rarity={rarity}>
        <div className="card-shimmer" aria-hidden="true" />
        <div className="scanline"    aria-hidden="true" />

        <header className="artifact-header">
          <div className="rarity-chip">{(loot.rarity ?? "JUNK").toUpperCase()}</div>
        </header>

        <section className="artifact-body">
          <h1 className="artifact-name">Credit Drop</h1>
          <p className="artifact-description">
            {loot.rarity === "Mythic" || loot.rarity === "Legendary"
              ? "Rare find. Credits added to your balance."
              : "Credits added to your balance."}
          </p>
          <div className="power-readout">
            <span className="label">CREDITS EARNED</span>
            <span className="value" style={{ color: "#fbbf24", fontSize: "1.5rem" }}>
              +{(loot.credits_earned ?? 0).toLocaleString()} CR
            </span>
          </div>
        </section>

        <footer className="artifact-footer">
          <button className="btn-claim primary" onClick={onDismiss}>
            COLLECT
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LootDisplay;
