import React from "react";

const LootDisplay = ({ loot, isOpening, onDismiss, userId }) => {
  const handleClaim = async (equipNow) => {
  console.log("--- DEBUG START ---");
  console.log("RAW userId PROP:", userId); 
  console.log("TYPE OF userId:", typeof userId);
  console.log("ITEM NAME:", loot?.name);
  console.log("--- DEBUG END ---");

  try {
    const res = await fetch("http://localhost:5000/api/inventory/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          item: loot,
          equipNow: equipNow,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Server rejected claim");
            }

            onDismiss();
  } catch (err) {
    console.error("CLAIM FAILED!!!", err.message);
  }
}
  if (isOpening && !loot) {
    return (
      <div className="loot-overlay">
        <div className="anomaly-detector">
          <div className="scanner-ring"></div>
          <h2 className="loader">LOADING SIGNAL...</h2>
        </div>
      </div>
    );
  }

  if (!loot) return null;

  return (
    <div className="loot-overlay">
      <div
        className={`artifact-card rarity-${loot.rarity?.toLowerCase() || "common"}`}>
        <div className="card-shimmer"></div>
        <div className="scanline"></div>

        <header className="artifact-header">
          <span className="origin-code">DROP RECEIVED:</span>
          <div className="rarity-chip">
            {loot.rarity?.toUpperCase() || "UNKNOWN"}
          </div>
        </header>

        <section className="artifact-body">
          <h1 className="artifact-name">{loot.name}</h1>
          <p className="artifact-description">{loot.description}</p>
          <div className="power-readout">
            <span className="label">CATEGORY</span>
            <span className="value">{loot.category || "GENERAL"}</span>
          </div>
        </section>

        <footer className="artifact-footer">
          <button
            className="btn-claim primary"
            onClick={() => handleClaim(true)}>
            CLAIM & EQUIP
          </button>
          <button
            className="btn-dismiss secondary"
            onClick={() => handleClaim(false)}>
            STORE IN INVENTORY
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LootDisplay;
