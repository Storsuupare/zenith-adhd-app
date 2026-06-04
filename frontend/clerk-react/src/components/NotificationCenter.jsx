import React from "react";
import "./NotificationCenter.css";

const EYEBROW = {
  success:  "MISSION COMPLETE",
  error:    "SYSTEM ERROR",
  critical: "WARNING",
  info:     "NOTICE",
};

const RARITY_COLORS = {
  legendary: "#ffae00",
  mythic:    "#a335ee",
  epic:      "#8b5cf6",
  rare:      "#22d3ee",
  uncommon:  "#1eff00",
  common:    "rgba(255,255,255,0.55)",
  junk:      "rgba(120,120,120,0.6)",
};

const NotificationCenter = React.memo(({ notifications }) => {
  if (!notifications?.length) return null;

  return (
    <div className="notification-center">
      {notifications.map((n) => {
        const type = n.type?.toLowerCase();

        if (type === "level_up") return null;

        // LOOT
        if (type === "loot") {
          const rarityKey = n.rarity?.toLowerCase() || "common";
          const color     = RARITY_COLORS[rarityKey] || RARITY_COLORS.common;
          return (
            <div
              key={n.id}
              className="notification-item loot"
              style={{ "--notif-rarity-color": color }}
            >
              <div className="notif-accent" style={{ background: color, boxShadow: `0 0 10px ${color}88` }} />
              <div className="notif-content">
                <span className="notif-eyebrow">DROP RECEIVED</span>
                <span className="notif-text notif-text--loot">{n.message}</span>
                {n.rarity && (
                  <span className="notif-rarity-chip" style={{ color, borderColor: `${color}44` }}>
                    {n.rarity.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          );
        }

        // PRESTIGE
        if (type === "prestige") {
          return (
            <div key={n.id} className="notification-item prestige notification-item--prestige">
              <div className="notif-accent" />
              <div className="notif-content">
                <span className="notif-eyebrow">PRESTIGE EVENT</span>
                <span className="notif-text">{n.message}</span>
              </div>
            </div>
          );
        }

        // Default template (success, error, critical, info, etc.)
        const eyebrow = EYEBROW[type];
        return (
          <div key={n.id} className={`notification-item ${type}`}>
            <div className="notif-accent" />
            <div className="notif-content">
              {eyebrow && <span className="notif-eyebrow">{eyebrow}</span>}
              <span className="notif-text">{n.message}</span>
              {n.subtext && <span className="notif-subtext">{n.subtext}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default NotificationCenter;
