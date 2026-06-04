import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext, useUIContext } from "../../../src/AppContext";
import "./NavSidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "⬡", label: "DASHBOARD", sub: "Mission Control"  },
  { to: "/grid",      icon: "◉", label: "GRID",      sub: "Active Operators" },
  { to: "/history",   icon: "◎", label: "HISTORY",   sub: "Focus Records"    },
  { to: "/shop",      icon: "◈", label: "SHOP",      sub: "Upgrades & Gear"  },
  { to: "/settings",  icon: "⚙", label: "SETTINGS",  sub: "System Config"    },
];

const RANK_LABELS = {
  GHOST:     "GH",
  SIGNAL:    "SG",
  OPERATIVE: "OP",
  CIPHER:    "CP",
  VANGUARD:  "VG",
  PHANTOM:   "PH",
  ZENITH:    "ZN",
};

const NavSidebar = () => {
  const { user, clerkUser, getRank } = useUserContext();
  const { playHaptic } = useUIContext();
  const navigate  = useNavigate();
  const [isOpen,    setIsOpen]    = useState(true);
  const [isPinned,  setIsPinned]  = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isVisible  = isOpen;
  const isExpanded = isVisible && (isPinned || isHovered);

  const close = () => {
    setIsOpen(false);
    setIsPinned(false);
    setIsHovered(false);
    playHaptic?.("TICK");
  };

  const level    = user?.level ?? 1;
  const rank     = getRank(level);
  const credits  = user?.system_credits ?? 0;
  const username = (user?.username ?? clerkUser?.username ?? "OPERATOR").toUpperCase();
  const hour     = new Date().getHours();
  const isRedzone = hour >= 0 && hour < 5;

  const sidebarClass = [
    "zenith-sidebar",
    !isVisible    ? "sidebar-closed"  : "",
    isExpanded    ? "expanded"        : "collapsed",
    isRedzone     ? "sidebar-redzone" : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      {/* ── Floating re-open trigger — only visible when sidebar is fully closed ── */}
      {!isVisible && (
        <button
          className={`sidebar-reopener${isRedzone ? " rz" : ""}`}
          onClick={() => { setIsOpen(true); playHaptic?.("TICK"); }}
          title="Open navigation"
          aria-label="Open navigation"
        >
          <span>≡</span>
        </button>
      )}

      <aside
        className={sidebarClass}
        onMouseEnter={() => isVisible && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── Close button ── */}
        <button
          className="sidebar-close-btn"
          onClick={close}
          title="Close navigation"
          aria-label="Close navigation"
        >
          ✕
        </button>

        {/* ── Brand ── */}
        <div className="sidebar-brand" onClick={() => navigate("/dashboard")}>
          <div className="sidebar-brand-icon">Z</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">ZENITH</span>
            <span className="sidebar-brand-ver">v2.1</span>
          </div>
          {isRedzone && <span className="sidebar-redzone-dot" title="RED ZONE ACTIVE" />}
        </div>

        <div className="sidebar-divider" />

        {/* ── Nav Items ── */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, icon, label, sub }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-nav-item${isActive ? " active" : ""}`}
              onClick={() => { playHaptic?.("TICK"); if (!isPinned) setIsHovered(false); }}
            >
              <span className="nav-item-icon">{icon}</span>
              <span className="nav-item-text">
                <span className="nav-item-label">{label}</span>
                <span className="nav-item-sub">{sub}</span>
              </span>
              <span className="nav-item-indicator" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-divider" />

        {/* ── Operator Footer ── */}
        <div className="sidebar-operator">
          <div className="operator-rank-badge">
            <span className="operator-rank-short">{RANK_LABELS[rank] ?? "??"}</span>
            <span className="operator-level">LVL {level}</span>
          </div>
          <div className="operator-info">
            <span className="operator-name">{username}</span>
            <span className="operator-credits">◈ {credits.toLocaleString()} CR</span>
          </div>
        </div>

        {/* ── Chevron pin toggle ── */}
        <button
          className={`sidebar-chevron-btn${isPinned ? " pinned" : ""}`}
          onClick={() => setIsPinned(p => !p)}
          title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          aria-label="Toggle sidebar pin"
        >
          <span className="sidebar-chevron-icon">›</span>
        </button>
      </aside>
    </>
  );
};

export default NavSidebar;
