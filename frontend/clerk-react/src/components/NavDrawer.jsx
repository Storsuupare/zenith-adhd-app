import React, { useEffect, useState, startTransition } from "react";
import { NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { useNavContext, useUserContext, useUIContext } from "../../../src/AppContext";
import { CHANGELOG } from "../data/changelog";
import "./NavDrawer.css";

const LATEST_VERSION = CHANGELOG[0]?.version ?? "";

function getHasUnread() {
  return localStorage.getItem("zenith_changelog_seen") !== LATEST_VERSION;
}

const NAV_ITEMS = [
  { to: "/dashboard", icon: "⬡", label: "Dashboard",       sub: "Mission Control"    },
  { to: "/shop",      icon: "◈", label: "Shop",             sub: "Upgrades & Credits" },
  { to: "/history",   icon: "◎", label: "Analytics",        sub: "Focus History"      },
  { to: "/updates",   icon: "◆", label: "Release Notes",    sub: "What's New?"        },
  { to: "/settings",  icon: "⚙", label: "Settings",         sub: "System Config"      },
];

const RANK_LABELS = {
  GHOST: "GH", SIGNAL: "SG", OPERATIVE: "OP",
  CIPHER: "CP", VANGUARD: "VG", PHANTOM: "PH", ZENITH: "ZN",
};

// ── Trigger rendered inline in <main> so it scrolls with content ──────────────
export const NavTrigger = () => {
  const { isNavOpen, setIsNavOpen } = useNavContext();
  const { isRedzone } = useUserContext();
  const { playHaptic } = useUIContext();
  return (
    <div className={`nav-trigger-block${isNavOpen ? " is-open" : ""}${isRedzone ? " rz" : ""}`}>
      <button
        className={`nav-trigger${isNavOpen ? " is-open" : ""}${isRedzone ? " rz" : ""}`}
        onClick={() => { playHaptic?.("TICK"); setIsNavOpen(v => !v); }}
        aria-label={isNavOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isNavOpen}
      >
        <span className="trigger-bar" />
        <span className="trigger-bar" />
        <span className="trigger-bar" />
      </button>
      
    </div>
  );
};

// ── Drawer: fixed overlay + panel only (no trigger rendered here) ─────────────
const NavDrawer = () => {
  const { isNavOpen, setIsNavOpen } = useNavContext();
  const { user, clerkUser, getRank, isRedzone } = useUserContext();
  const { playHaptic } = useUIContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [hasUnread, setHasUnread] = useState(getHasUnread);

  useEffect(() => {
    setIsNavOpen(false);
    setHasUnread(getHasUnread());
  }, [location.pathname]);

  const close = () => { setIsNavOpen(false); playHaptic?.("TICK"); };

  const level    = user?.level ?? 1;
  const rank     = getRank(level);
  const credits  = user?.system_credits ?? 0;

  const username = (user?.username ?? clerkUser?.username ?? "OPERATOR").toUpperCase();

  return (
    <>
      {/* ── Background overlay — click to close ── */}
      <div
        className={`nav-overlay${isNavOpen ? " visible" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <aside
        className={`nav-drawer${isNavOpen ? " open" : ""}${isRedzone ? " rz" : ""}`}
        aria-label="Main navigation"
        inert={!isNavOpen || undefined}
      >

        {/* Header row */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <div className="drawer-brand-icon">Z</div>
            <div className="drawer-brand-text">
              <span className="drawer-brand-name">ZENITH</span>
              
            </div>
          </div>
          <button className="drawer-close" onClick={close} aria-label="Close navigation">
            ✕
          </button>
        </div>

        {/* Operator identity block */}
        <div className="drawer-operator">
          <div className="drawer-op-row">
            <div className="drawer-op-badge">
              <span className="drawer-op-rank-short">{RANK_LABELS[rank] ?? "?"}</span>
              <span className="drawer-op-lvl">LVL {level}</span>
            </div>
            <div className="drawer-op-info">
              <span className="drawer-op-label">Profile</span>
              <span className="drawer-op-name">{username}</span>
              <span className="drawer-op-credits">◈ {credits.toLocaleString()} CR</span>
            </div>
          </div>
        
        </div>

        <div className="drawer-divider" />

{/* Nav links */}
        <nav className="drawer-nav">
          {NAV_ITEMS.map(({ to, icon, label, sub }, idx) => {
            const showDot = to === "/updates" && hasUnread;
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `drawer-nav-item${isActive ? " active" : ""}`}
                style={{ "--item-delay": `${idx * 0.045}s` }}
                onClick={(e) => {
                  e.preventDefault();
                  playHaptic?.("TICK");
                  close();
                  startTransition(() => navigate(to));
                }}
              >
                <span className="drawer-nav-icon">{icon}</span>
                <span className="drawer-nav-text">
                  <span className="drawer-nav-label">
                    {label}
                    {showDot && <span className="drawer-unread-dot" aria-label="New updates available" />}
                  </span>
                  <span className="drawer-nav-sub">{sub}</span>
                </span>
                <span className="drawer-nav-arrow">›</span>
              </NavLink>
            );
          })}

        </nav>

        {/* Red Zone footer */}
        {isRedzone && (
          <div className="drawer-redzone-badge">
            <span className="drawer-rz-icon">⚠</span>
            <div className="drawer-rz-text">
              <span>RED ZONE ACTIVE</span>
              <span>00:00 — 05:00 · challenge modifier on</span>
            </div>
          </div>
        )}

        {/* Legal footer */}
        <div className="drawer-legal">
          <Link to="/privacy" className="drawer-legal-link" onClick={close}>Privacy</Link>
          <span className="drawer-legal-sep">·</span>
          <Link to="/terms" className="drawer-legal-link" onClick={close}>Terms</Link>
        </div>
      </aside>
    </>
  );
};

export default NavDrawer;
