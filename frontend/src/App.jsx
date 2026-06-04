import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  useClerk,
  useAuth,
} from "@clerk/clerk-react";
import {
  fetchUser    as apiGetUser,
  createUser   as apiCreateUser,
  fetchTasks   as apiGetTasks,
  createTask   as apiCreateTask,
  createTaskBatch as apiCreateTaskBatch,
  completeTask as apiCompleteTask,
  failTask     as apiFailTask,
  prestigeSkill as apiPrestigeSkill,
  fetchInventory as apiFetchInventory,
  rollLoot,
  equipItem,
  fetchModules,
  claimDailyBonus,
  configureAuth,
} from "./services/api";
import "./App.css";
import "../clerk-react/src/components/StatHUD.css";
import "../clerk-react/src/components/SkillSideBar.css";
import "../clerk-react/src/components/NotificationCenter.css";
import "../clerk-react/src/components/MissionForm.css";
import "../clerk-react/src/components/LootDisplay.css";
import "../clerk-react/src/components/ContractCard.css";
import "../clerk-react/src/components/VolumeSlider.css";
import "../clerk-react/src/components/DailyChallenge.css";
import "../clerk-react/src/components/PaymentSuccess.css";
import "../clerk-react/src/components/PaymentCancel.css";
import "../clerk-react/src/components/ShatterModal.css";
import "../clerk-react/src/components/ElevationChart.css";
import "../clerk-react/src/components/EarningSummary.css";
import "../clerk-react/src/components/PrestigeCinematic.css";
import "../clerk-react/src/components/SummitHistory.css";
import "../clerk-react/src/components/NavDrawer.css";
import "../clerk-react/src/components/DashboardView.css";
;

import { UserContext, TaskContext, UIContext, NavContextProvider } from "./AppContext";
import { usePushNotifications } from "../clerk-react/src/hooks/usePushNotifications";
import { API_BASE }   from "./config";
import { getSolarPhase } from "./utils/solar";
import {
  PERK_EFFECT_HINTS,
  SKILL_COLORS,
  TIME_CONFIG,
  SUBJECT_TO_SKILL_MAP,
  COSMETICS,
} from "../clerk-react/src/utils/constants";

import NavDrawer, { NavTrigger } from "../clerk-react/src/components/NavDrawer";
import AuthScreen from "../clerk-react/src/components/AuthScreen";
import DashboardView    from "../clerk-react/src/components/DashboardView";
import VaultPage        from "../clerk-react/src/components/VaultPage";
import ArchivesPage     from "../clerk-react/src/components/ArchivesPage";
import ExchangePage     from "../clerk-react/src/components/ExchangePage";
import SettingsPage     from "../clerk-react/src/components/SettingsPage";
import ReleaseNotesPage from "../clerk-react/src/components/ReleaseNotesPage";
import PrivacyPage      from "../clerk-react/src/components/PrivacyPage";
import TermsPage        from "../clerk-react/src/components/TermsPage";

import LootDisplay      from "../clerk-react/src/components/LootDisplay";
import EarningSummary  from "../clerk-react/src/components/EarningSummary";
import NotificationCenter from "../clerk-react/src/components/NotificationCenter";
import ShatterModal     from "../clerk-react/src/components/ShatterModal";
import PaymentSuccess   from "../clerk-react/src/components/PaymentSuccess";
import PaymentCancel    from "../clerk-react/src/components/PaymentCancel";
import OnboardingModal       from "../clerk-react/src/components/OnboardingModal";
import FirstSessionScreen   from "../clerk-react/src/components/FirstSessionScreen";
import "../clerk-react/src/components/FirstSessionScreen.css";
import PrestigeCinematic    from "../clerk-react/src/components/PrestigeCinematic";
import ErrorBoundary    from "./components/ErrorBoundary";

import { playUISound, setPhase, setProtocol, duckNotification } from "./audio/audioEngine";
import { useZenithAudio } from "./audio/useZenithAudio";
import * as AchievementEngine from "./AchievementEngine.js";
import * as DailyEngine from "./DailyEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CONTRACT_TIERS   = [
  { mins: 5, xp: 250, req: 1 }, { mins: 15, xp: 1200, req: 1 },
  { mins: 30, xp: 4000, req: 1 }, { mins: 60, xp: 10000, req: 20 },
  { mins: 90, xp: 15800, req: 30 }, { mins: 120, xp: 30000, req: 40 },
];
const THEME_ACCENT = {
  cobalt: "#3b82f6", amber: "#f59e0b", crimson: "#ef4444",
  violet: "#8b5cf6", jade: "#10b981",
  neon: "#f72585", arctic: "#67e8f9", solar: "#fb8500",
  nebula: "#7209b7", obsidian: "#6d28d9", ghost: "#e2e8f0",
};

// ─────────────────────────────────────────────────────────────────────────────
// Haptic audio engine (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
let audioCtx = null;
const HAPTIC_QUEUE = [];
let hapticPending = false;

const scheduleHaptic = (type, level = 1) => {
  HAPTIC_QUEUE.push({ type, level });
  if (hapticPending) return;
  hapticPending = true;
  requestAnimationFrame(() => {
    requestIdleCallback
      ? requestIdleCallback(flushHapticQueue, { timeout: 32 })
      : setTimeout(flushHapticQueue, 0);
  });
};

const flushHapticQueue = () => {
  hapticPending = false;
  while (HAPTIC_QUEUE.length) {
    const { type, level } = HAPTIC_QUEUE.shift();
    playHapticSync(type, level);
  }
};

const playHapticSync = (type, level = 1) => {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") { audioCtx.resume().catch(() => {}); return; }
  const now = audioCtx.currentTime;
  const createTone = (freq, startOffset, dur, waveType = "square", volume = 0.1, rampTo = 1.2) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = waveType;
    o.frequency.setValueAtTime(freq, now + startOffset);
    o.frequency.exponentialRampToValueAtTime(freq * rampTo, now + startOffset + dur);
    g.gain.setValueAtTime(volume, now + startOffset);
    g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now + startOffset); o.stop(now + startOffset + dur);
  };
  const makeNoise = (startOffset, dur, volume) => {
    const src = audioCtx.createBufferSource();
    const sz = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    const gn = audioCtx.createGain();
    gn.gain.setValueAtTime(volume, now + startOffset);
    gn.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
    src.connect(gn).connect(audioCtx.destination);
    src.start(now + startOffset);
  };
  switch (type) {
    case "TICK": {
      createTone(1600, 0,     0.04, "sine", 0.045, 0.97);
      createTone(2200, 0.025, 0.03, "sine", 0.022, 0.97);
      break;
    }
    case "DEPLOY": {
      const sp  = audioCtx.createOscillator();
      const spG = audioCtx.createGain();
      sp.type = "square";
      sp.frequency.setValueAtTime(100, now);
      sp.frequency.exponentialRampToValueAtTime(700, now + 0.14);
      spG.gain.setValueAtTime(0.07, now);
      spG.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      sp.connect(spG).connect(audioCtx.destination);
      sp.start(now);
      sp.stop(now + 0.14);
      createTone(900,  0.15, 0.05, "sine",     0.1,  1.0);
      createTone(1350, 0.17, 0.04, "sine",     0.06, 1.0);
      createTone(65,   0.21, 0.4,  "sawtooth", 0.18, 0.45);
      createTone(130,  0.21, 0.12, "square",   0.07, 0.75);
      break;
    }
    case "VAULT_OPEN": {
      createTone(95,   0,    0.12, "sawtooth", 0.14,  0.5);
      createTone(75,   0.08, 0.22, "square",   0.09,  0.55);
      createTone(3400, 0.07, 0.35, "sine",     0.03,  0.84);
      createTone(1700, 0.09, 0.28, "sine",     0.025, 0.88);
      makeNoise(0.05, 0.22, 0.028);
      break;
    }
    case "SUCCESS": {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        createTone(f, i * 0.08, 0.55, "sine", 0.09, 1.004)
      );
      createTone(1318.5, 0.24, 0.5, "sine", 0.04, 1.002);
      break;
    }
    case "ABORT": {
      createTone(880, 0,    0.09, "square", 0.2,  1.0);
      createTone(660, 0.12, 0.09, "square", 0.2,  1.0);
      createTone(440, 0.24, 0.1,  "square", 0.25, 1.0);
      const sw  = audioCtx.createOscillator();
      const swG = audioCtx.createGain();
      sw.type = "sawtooth";
      sw.frequency.setValueAtTime(380, now + 0.33);
      sw.frequency.exponentialRampToValueAtTime(32, now + 0.9);
      swG.gain.setValueAtTime(0.18, now + 0.33);
      swG.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      sw.connect(swG).connect(audioCtx.destination);
      sw.start(now + 0.33);
      sw.stop(now + 0.9);
      makeNoise(0.33, 0.14, 0.07);
      break;
    }
    case "LEVEL_UP": {
      if (level >= 99) {
        [261.63, 329.63, 392.0, 523.25, 659.25].forEach((f, i) =>
          createTone(f, i * 0.1, 1.4, "sine", 0.1, 1.008)
        );
      } else {
        createTone(440, 0,    0.12, "sine", 0.1,  1.5);
        createTone(659, 0.1,  0.12, "sine", 0.11, 1.2);
        createTone(880, 0.21, 0.35, "sine", 0.09, 1.04);
      }
      break;
    }
    case "PRESTIGE_ASCENT": {
      const tb  = audioCtx.createOscillator();
      const tG  = audioCtx.createGain();
      tb.type = "sawtooth";
      tb.frequency.setValueAtTime(40, now);
      tb.frequency.exponentialRampToValueAtTime(1200, now + 1.3);
      tG.gain.setValueAtTime(0, now);
      tG.gain.linearRampToValueAtTime(0.14, now + 0.65);
      tG.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      tb.connect(tG).connect(audioCtx.destination);
      tb.start(now);
      tb.stop(now + 1.3);
      createTone(880, 1.1, 0.4, "sine", 0.06, 1.2);
      break;
    }
    case "PRESTIGE_EQUIP": {
      [220, 440, 660, 880].forEach((f, i) =>
        createTone(f, i * 0.08, 0.45, "sine", 0.07, 1.15)
      );
      break;
    }
    case "HISS": {
      makeNoise(0, 0.18, 0.05);
      createTone(3200, 0, 0.1, "sine", 0.015, 0.5);
      break;
    }
    case "SHARD_DROP": {
      createTone(60,   0,    0.5, "sine", 0.35, 0.75);
      createTone(2800, 0.02, 0.1, "sine", 0.08, 0.95);
      makeNoise(0.02, 0.08, 0.015);
      break;
    }
    case "SHEPARD": {
      [220, 440, 880, 1760].forEach((freq, i) =>
        createTone(freq, i * 0.055, 1.4, "sine", 0.058 - i * 0.01, 1.333)
      );
      break;
    }
    case "CREDIT": {
      createTone(523.25, 0,    0.18, "sine", 0.08, 1.002);
      createTone(659.25, 0.12, 0.18, "sine", 0.08, 1.002);
      createTone(880,    0.24, 0.35, "sine", 0.07, 1.004);
      break;
    }
    default: break;
  }
};
const playHaptic = (type, level = 1) => scheduleHaptic(type, level);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getRank = (lvl) => {
  if (lvl < 10)  return "STATIC";
  if (lvl < 20)  return "IMPULSE";
  if (lvl < 40)  return "SIGNAL";
  if (lvl < 60)  return "KINETIC";
  if (lvl < 80)  return "APEX";
  if (lvl < 99)  return "PHANTOM";
  return "ZENITH";
};




const getMissionStakes = (duration) => {
  const stakes = { 5: 250, 15: 1200, 30: 4000, 60: 10000, 90: 15800, 120: 30000, 0.1666: 9999 };
  const baseAmount = stakes[duration] || Math.floor(duration * 10);
  const stakesHour = new Date().getHours();
  if (stakesHour >= 0 && stakesHour < 5) return Math.floor(baseAmount / 2);
  return baseAmount;
};

const calculateSurvivalStakes = (basePenalty) => {
  const survivalHour = new Date().getHours();
  const survivalMultiplier = survivalHour < 7 ? 3 : 1;
  return basePenalty * survivalMultiplier;
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

const DARK_THEMES  = new Set(["neon", "arctic", "nebula", "obsidian", "ghost"]);
const CLOUD_HIDDEN = new Set(["neon", "arctic", "nebula", "obsidian"]);

const SolarBackdrop = React.memo(function SolarBackdrop({ solarPhase, activeTheme }) {
  const forceDark  = DARK_THEMES.has(activeTheme);
  const showClouds = (solarPhase === "morning" || solarPhase === "day") && !CLOUD_HIDDEN.has(activeTheme);
  const showNight  = solarPhase === "night" || forceDark;
  const showSun    = solarPhase !== "night" && !forceDark;
  const stars = React.useMemo(() => {
    if (!showNight) return [];
    return Array.from({ length: 60 }, (_, i) => ({
      x: (i * 37) % 100, y: (i * 53) % 90,
      delay: (i * 0.37) % 4, size: 1 + ((i * 7) % 3),
    }));
  }, [showNight]);
  return (
    <div className="solar-backdrop" aria-hidden="true">
      {showSun && <div className={`sun sun-${solarPhase}`} />}
      {showClouds && (
        <div className="backdrop-clouds">
          <div className="cloud cloud-1" /><div className="cloud cloud-2" />
          <div className="cloud cloud-3" /><div className="cloud cloud-4" />
        </div>
      )}
      {showNight && (
        <div className="backdrop-night">
          <div className="moon"><div className="moon-glow" /></div>
          <div className="stars">
            {stars.map((s, i) => (
              <span key={i} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${s.delay}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

const App = () => {
  const [user,       setUser]       = useState(null);
  const [contracts,  setContracts]  = useState([]);
  const [inventory,  setInventory]  = useState([]);
  const [banReason, setBanReason] = useState(null);

  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();

  useEffect(() => { configureAuth(getToken); }, []);

  usePushNotifications(clerkUser?.id);
  const navigate = useNavigate();


  const [streak,        setStreak]        = useState(0);
  const [notifications, setNotifications] = useState([]);

  const [previewSkill, setPreviewSkill] = useState(null);
  const [previewXP,    setPreviewXP]    = useState(0);

  const [modules,        setModules]        = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);


  const [levelUpData,    setLevelUpData]    = useState(null);
  const [xpGain,         setXpGain]         = useState(0);
  const [xpBurstKey,     setXpBurstKey]     = useState(0);
  const [completionTick, setCompletionTick] = useState(0);
  const [isOpening,      setIsOpening]      = useState(false);
  const [loot,           setLoot]           = useState(null);
  const [earningSummary, setEarningSummary] = useState(null);
  const [prestigeData,   setPrestigeData]   = useState(null);
  const [pendingLoot,    setPendingLoot]    = useState(null);

  const [showOnboarding,    setShowOnboarding]    = useState(false);
  const [showFirstSession,  setShowFirstSession]  = useState(false);

  const [isShatterModalOpen,  setIsShatterModalOpen]  = useState(false);
  const [pendingTask,         setPendingTask]         = useState(null);
  const [isInventoryOpen,     setIsInventoryOpen]     = useState(false);
  const [activeTheme,         setActiveThemeRaw]      = useState(() => localStorage.getItem("zenith_theme") || "default");
  const [elevationKey,        setElevationKey]        = useState(0);
  const [chartPending,        setChartPending]        = useState(null);
  const [activeAmbientTrack,  setActiveAmbientTrackRaw] = useState(() => localStorage.getItem("zenith_audio") || "focus");

  const setActiveTheme = useCallback((id) => {
    localStorage.setItem("zenith_theme", id);
    setActiveThemeRaw(id);
  }, []);

  const setActiveAmbientTrack = useCallback((id) => {
    localStorage.setItem("zenith_audio", id);
    setActiveAmbientTrackRaw(id);
  }, []);
  const [paymentView,         setPaymentView]         = useState(null);
  const [levelUpSkill,        setLevelUpSkill]        = useState(null);
  const [activeSkillName,     setActiveSkillName]     = useState(null);

  const [solarPhase, setSolarPhase] = useState(getSolarPhase());
  const { playLevelUp, atmosphereVolume, handleAtmosphereVolumeChange } = useZenithAudio(solarPhase);

  const isOpeningRef   = useRef(false);
  const contractsRef   = useRef(contracts);
  const userRef        = useRef(user);
  const inventoryRef   = useRef(inventory);
  useEffect(() => { contractsRef.current = contracts; }, [contracts]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchUser = useCallback(async () => {
    if (!clerkUser?.id) return;
    try {
      const userResponse = await apiGetUser(clerkUser.id);
      if (userResponse.data) setUser(userResponse.data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === "USER_BANNED") {
        setBanReason(err.response.data.reason || "Your account has been banned.");
      } else if (err.response?.status === 404) {
        try {
          const userCreateRes = await apiCreateUser({
            clerkId:  clerkUser.id,
            username: clerkUser.username || "Recruit",
            email:    clerkUser.primaryEmailAddress?.emailAddress,
          });
          setUser(userCreateRes.data);
        } catch (postErr) {
          if (postErr.response?.status === 403 && postErr.response?.data?.error === "USERNAME_RESERVED") {
            setBanReason("Your username contains a reserved word and is not allowed on Zenith. Change your username and try again, or contact support if you think this is a mistake.");
          } else {
            console.error("INITIALIZATION_FAILED:", postErr.message);
          }
        }
      } else {
        console.error("CRITICAL_FETCH_ERROR:", err.message);
      }
    }
  }, [clerkUser?.id]);

  const fetchContracts = useCallback(async () => {
    if (!clerkUser?.id) return;
    try {
      const res = await apiGetTasks(clerkUser.id);
      setContracts(res.data);
    } catch (err) { console.error("CONTRACT_SYNC_ERROR", err); }
  }, [clerkUser?.id]);

  const fetchInventory = useCallback(async () => {
    if (!clerkUser?.id) return;
    try {
      const res = await apiFetchInventory(clerkUser.id);
      setInventory(res.data);
    } catch (err) { console.error("INVENTORY_SYNC_ERROR", err); }
  }, [clerkUser?.id]);

  useEffect(() => {
    if (isLoaded && clerkUser?.id) { fetchUser(); fetchContracts(); }
  }, [isLoaded, clerkUser?.id]);

  // When user data loads, validate the stored theme and audio against the user's
  // actual tier. If they can't access it (e.g. logged in on a shared device after
  // a PRO user), silently reset to the free defaults.
  useEffect(() => {
    if (!user) return;
    const tier  = user.account_tier ?? 0;
    const owned = Array.isArray(user.purchased_cosmetics) ? user.purchased_cosmetics : [];

    const storedTheme = localStorage.getItem("zenith_theme");
    if (storedTheme && storedTheme !== "default") {
      const meta = COSMETICS.themes.find(t => t.id === storedTheme);
      const accessible =
        !meta ||
        meta.type === "free" ||
        (meta.type === "credits" && owned.includes(storedTheme)) ||
        (meta.type === "pro"    && tier >= 1) ||
        (meta.type === "elite"  && tier >= 2);
      if (!accessible) setActiveTheme("default");
    }

    const storedAudio = localStorage.getItem("zenith_audio");
    if (storedAudio && storedAudio !== "focus") {
      const meta = COSMETICS.audio.find(a => a.id === storedAudio);
      const accessible =
        !meta ||
        meta.type === "free" ||
        (meta.type === "credits" && owned.includes(storedAudio)) ||
        (meta.type === "pro"    && tier >= 1) ||
        (meta.type === "elite"  && tier >= 2);
      if (!accessible) setActiveAmbientTrack("focus");
    }
  }, [user?.account_tier, user?.purchased_cosmetics]);

  // Gate the first-session screen and onboarding tour once per user account.
  // New users see the stripped-down first-session screen first, then the tour.
  useEffect(() => {
    if (!clerkUser?.id || !user) return;
    const firstSessionKey = `zenith_first_session_${clerkUser.id}`;
    const onboardedKey    = `zenith_onboarded_${clerkUser.id}`;
    if (!localStorage.getItem(firstSessionKey)) {
      setShowFirstSession(true);
    } else if (!localStorage.getItem(onboardedKey)) {
      setShowOnboarding(true);
    }
  }, [clerkUser?.id, user]);

  useEffect(() => {
    if (!isLoaded || !clerkUser?.id) return;
    const currentClerkId = clerkUser.id;
    // Safety-net poll — SSE handles real-time; this catches any missed events
    const poll = setInterval(async () => {
      if (document.hidden || isOpeningRef.current) return;
      try {
        const [pollUserRes, pollTaskRes] = await Promise.all([
          apiGetUser(currentClerkId),
          apiGetTasks(currentClerkId),
        ]);
        if (pollUserRes.data) setUser(pollUserRes.data);
        setContracts(pollTaskRes.data);
      } catch { /* silent */ }
    }, 60_000);
    return () => clearInterval(poll);
  }, [isLoaded, clerkUser?.id]);

  // SSE: instant push for BW/XP/credits/tier changes — replaces 30s lag.
  // EventSource doesn't support headers so the Clerk JWT is passed as a query
  // param. getToken() always returns a fresh token (Clerk caches + auto-refreshes).
  useEffect(() => {
    if (!isLoaded || !clerkUser?.id) return;
    let es = null;
    let cancelled = false;

    const connect = async () => {
      if (cancelled) return;
      try {
        const token = await getToken();
        if (cancelled) return;
        es = new EventSource(`${API_BASE}/api/stream/${clerkUser.id}?token=${encodeURIComponent(token)}`);
        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "user_patch") {
              const { inventory: inv, ...userFields } = msg.data;
              setUser(prev => prev ? { ...prev, ...userFields } : prev);
              if (inv) setInventory(inv);
            }
          } catch { /* malformed frame */ }
        };
      } catch { /* token fetch failed — safety-net poll covers this */ }
    };

    connect();
    return () => { cancelled = true; es?.close(); };
  }, [isLoaded, clerkUser?.id]);

  // ── Notifications ─────────────────────────────────────────────────────────

  const addNotification = useCallback((notif) => {
    const uniqueNotifId = Date.now();
    duckNotification();
    setNotifications(prev => [{ ...notif, id: uniqueNotifId }, ...prev].slice(0, 5));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== uniqueNotifId)), 5500);
  }, []);

  // ── Mission handlers ──────────────────────────────────────────────────────

  const startMission = async (task, subTasks, optimisticId = null) => {
    const { taskName: taskName, duration: tDuration, stakeAmount: tStake, skillName: tSkill } = task;
    try {
      const taskResponse = await apiCreateTask({
        externalId: clerkUser.id,
        taskName: taskName,
        durationMinutes: tDuration,
        stakeAmount: tStake,
        skillName: tSkill || null,
        sub_tasks: subTasks,
      });

      setContracts(prev => {
        const baseContracts = optimisticId ? prev.filter(c => c.id !== optimisticId) : prev;
        return [...baseContracts, taskResponse.data];
      });
      await fetchUser();

      if (tSkill) setActiveSkillName(tSkill.toUpperCase());

      setIsShatterModalOpen(false);
      setPendingTask(null);
      setPreviewXP(0);
    } catch (err) {
      if (optimisticId) setContracts(prev => prev.filter(c => c.id !== optimisticId));
      console.error("START_FAILED:", err.response?.data || err.message);
      const errData = err.response?.data;
      addNotification({ type: "ERROR", message: errData?.detail || errData?.error || "Couldn't start task, try again" });
    }
  };

  const startShatteredMission = async (parentTask, subTasks) => {
    if (!clerkUser?.id) return;
    const SUB_DURATION = 30;
    const baseStake    = getMissionStakes(SUB_DURATION);
    const tasks = subTasks.map(sub => ({
      taskName:        sub.text,
      durationMinutes: SUB_DURATION,
      stakeAmount:     calculateSurvivalStakes(baseStake),
      skillName:       parentTask.skillName || null,
    }));
    try {
      const batchResponse = await apiCreateTaskBatch({ externalId: clerkUser.id, tasks });
      batchResponse.data.forEach(batchTask => setContracts(prev => [...prev, batchTask]));
      await fetchUser();
      setIsShatterModalOpen(false);
      setPendingTask(null);
      setPreviewXP(0);
      addNotification({ type: "SUCCESS", message: `Task split into ${tasks.length} × 30 min chunks.` });
    } catch (err) {
      addNotification({ type: "ERROR", message: err.response?.data?.message || err.response?.data?.error || "Shatter failed" });
    }
  };

  const handleInitiate = async (submittedName, submittedIntention = "", explicitSkill = null, duration = 30) => {
    const resolvedName = submittedName.trim();
    const numericDuration = Number(duration);
    const currentStake    = getMissionStakes(numericDuration);
    if (!resolvedName || !clerkUser?.id) return;
    playHaptic("DEPLOY");

    let skillName = explicitSkill || null;
    if (!skillName) {
      const candidates = [resolvedName, resolvedName.split(":")[0].trim(), selectedModule?.subject].filter(Boolean);
      for (const c of candidates) {
        const hit = Object.entries(SUBJECT_TO_SKILL_MAP).find(([k]) => k.toLowerCase() === c.toLowerCase());
        if (hit) { skillName = hit[1]; break; }
      }
    }

    const task = {
      taskName: resolvedName,
      duration: numericDuration,
      stakeAmount: currentStake,
      skillName: skillName || null,
      intention: submittedIntention.trim() || null,
    };

    const userTier     = user?.account_tier ?? 0;
    const isSubscribed = userTier >= 1;

    // 120 min is PRO+ only — block FREE users before any API call
    if (numericDuration === 120 && !isSubscribed) {
      addNotification({ type: "INFO", message: "120 min sessions are PRO only. Upgrade in the Shop." });
      return;
    }

    // PRO+ on 120 min → open Shatter modal
    if (numericDuration === 120 && isSubscribed) { setPendingTask(task); setIsShatterModalOpen(true); return; }

    // Optimistic: show card immediately before server round-trip
    const optimisticId = `_opt_${Date.now()}`;
    setContracts(prev => [...prev, {
      id: optimisticId,
      _optimistic: true,
      title: resolvedName,
      duration_minutes: numericDuration,
      stake_amount: currentStake,
      skill_name: skillName || "General",
      deadline: null,
    }]);
    setPreviewXP(0);

    await startMission(task, [], optimisticId);
  };

  const handleContractCreated = useCallback((newContract) => setContracts(prev => [...prev, newContract]), []);

  const handleComplete = useCallback(async (taskId) => {
    if (!clerkUser?.id || isOpeningRef.current) return;
    const contract = contractsRef.current.find(c => String(c.id) === String(taskId));

    // Optimistic: remove immediately so the UI responds in <16ms
    setContracts(prev => prev.filter(t => String(t.id) !== String(taskId)));

    try {
      isOpeningRef.current = true;
      setIsOpening(true);
      if (contract?.duration_minutes)
        setChartPending({ minutes: Number(contract.duration_minutes), title: contract.title || "Mission" });

      const completeRes = await apiCompleteTask(taskId);
      playHaptic("SHEPARD");

      const {
        reward, credits_earned, user: updatedUser, drop, leveledUp, newLevel,
        bw_stake, skill_name: completedSkillName, perk_active: completedPerkName, xp_multiplier: completedXpMult,
      } = completeRes.data;

      setUser(prev => prev ? {
        ...prev,
        ...updatedUser,
        system_credits: updatedUser?.system_credits ?? ((prev.system_credits ?? 0) + (credits_earned ?? 0)),
      } : prev);

      // Hold the loot drop — show cinematic reveal after earnings summary dismisses
      if (drop) setPendingLoot(drop);

      const currentTier = updatedUser?.account_tier ?? userRef.current?.account_tier ?? 0;
      const currentStreak = updatedUser?.streak ?? userRef.current?.streak ?? 0;

      // Show the earnings summary card — replaces the individual XP/credit notifications
      setEarningSummary({
        xpGained:      reward,
        creditsEarned: credits_earned ?? 0,
        skillName:     completedSkillName || null,
        xpMultiplier:  completedXpMult ?? 1,
        perkActive:    completedPerkName || null,
        duration:      contract?.duration_minutes ?? null,
        streak:        currentStreak,
        levelUp:       leveledUp ? { level: newLevel, rank: getRank(newLevel), tier: currentTier } : null,
      });

      if (leveledUp) {
        setLevelUpData({ level: newLevel, rank: getRank(newLevel), xpGain: reward, tier: currentTier, skillName: completedSkillName || null });
        playLevelUp();
        if (completedSkillName) setLevelUpSkill(completedSkillName);
      } else {
        setXpGain(reward);
        setXpBurstKey(k => k + 1);
        setTimeout(() => setXpGain(0), 2000);
      }

      const sessionMins = contract?.duration_minutes ?? 0;
      if (sessionMins >= 60) {
        const breakMins = sessionMins >= 90 ? 15 : 10;
        setTimeout(() => addNotification({ type: "critical", message: `⏸ Take a ${breakMins}-min break, you earned it.` }), 1800);
      }

      DailyEngine.signal({ skillName: completedSkillName || null, sessionMins }, clerkUser?.id);
      setCompletionTick(t => t + 1);

      AchievementEngine.check({ streak: updatedUser?.streak ?? userRef.current?.streak ?? 0, sessionMins })
        .forEach(ach => addNotification({ type: "prestige", message: `🏆 ${ach.title}! ${ach.description}` }));

      setContracts(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setPreviewXP(0);
      setPreviewSkill(null);
      setActiveSkillName(null);
      setElevationKey(k => k + 1);
      setTimeout(() => setChartPending(null), 1500);

      await Promise.all([fetchUser(), fetchContracts()]);
      isOpeningRef.current = false;
      setIsOpening(false);
    } catch (err) {
      isOpeningRef.current = false;
      setIsOpening(false);
      setChartPending(null);
      if (contract) setContracts(prev => [...prev, contract]);
      console.error("CRITICAL_SYNC_FAILURE:", err.response?.data || err.message);
      if (err.response?.status === 425) {
        const secs = err.response?.data?.seconds_remaining ?? 0;
        const mins = Math.ceil(secs / 60);
        addNotification({ type: "ERROR", message: `Task not complete yet — ${mins > 1 ? `${mins} min` : `${secs}s`} remaining` });
      } else {
        addNotification({ type: "ERROR", message: "Couldn't sync, try again" });
      }
    }
  }, [clerkUser?.id, addNotification, fetchUser, fetchContracts, playLevelUp]);

  const handleAbort = useCallback(async (taskId) => {
    playHaptic("ABORT");
    const snapshot = contractsRef.current.find(t => t.id === taskId);

    setContracts(prev => prev.filter(t => t.id !== taskId));
    setActiveSkillName(null);
    setPreviewXP(0);
    setPreviewSkill(null);

    try {
      const abortRes = await apiFailTask(taskId);
      setUser(prev => prev ? { ...prev, ...abortRes.data } : prev);
      if (abortRes.data.grace_period) {
        addNotification({ type: "SUCCESS", message: "Task dropped — stake refunded, no penalty." });
      } else if (abortRes.data.streak_shield_used) {
        addNotification({ type: "SUCCESS", message: "Streak Guard activated — streak protected. Perk consumed." });
      } else {
        addNotification({ type: "CRITICAL", message: "Mission abandoned — stake lost, no rewards." });
      }
      await fetchUser();
    } catch (err) {
      if (snapshot) setContracts(prev => [...prev, snapshot]);
      console.error("ABORT SYNC FAILURE", err);
      addNotification({ type: "ERROR", message: "Couldn't end session, try again" });
    }
  }, [clerkUser?.id, addNotification, fetchUser]);

  const handlePrestige = useCallback(async (skillName) => {
    playHaptic("PRESTIGE_ASCENT");
    try {
      const prestigeRes = await apiPrestigeSkill(skillName);
      if (prestigeRes.data.success) {
        const skill   = prestigeRes.data.skill;
        const drop    = prestigeRes.data.drop;
        setPrestigeData({
          skillName,
          prestigeLevel: skill?.prestige_level ?? 1,
          creditReward:  drop?.credits_earned ?? 3500,
          drop,
        });
        fetchUser();
      }
    } catch (err) {
      addNotification({ type: "ERROR", message: err.response?.data?.error || "Prestige failed, try again" });
    }
  }, [addNotification, fetchUser]);

  const handlePrestigeDismiss = useCallback(() => {
    const drop = prestigeData?.drop;
    setPrestigeData(null);
    if (drop) setLoot(drop);
  }, [prestigeData, setLoot]);

  // ── First-session screen handlers ─────────────────────────────────────────

  const handleFirstSessionStart = async (name, durationMins) => {
    if (!clerkUser?.id) return;
    localStorage.setItem(`zenith_first_session_${clerkUser.id}`, "1");
    setShowFirstSession(false);
    playHaptic("DEPLOY");
    const currentStake = getMissionStakes(durationMins);
    await startMission({
      taskName: name,
      duration: durationMins,
      stakeAmount: currentStake,
      skillName: null,
      intention: null,
    }, []);
    // Show tour now that their first session is live — it can point to real UI
    const onboardedKey = `zenith_onboarded_${clerkUser.id}`;
    if (!localStorage.getItem(onboardedKey)) setShowOnboarding(true);
  };

  const handleFirstSessionSkip = () => {
    if (!clerkUser?.id) return;
    localStorage.setItem(`zenith_first_session_${clerkUser.id}`, "1");
    setShowFirstSession(false);
    // Show the onboarding tour if they haven't seen it
    const onboardedKey = `zenith_onboarded_${clerkUser.id}`;
    if (!localStorage.getItem(onboardedKey)) setShowOnboarding(true);
  };

  const handleDailyBonus = useCallback(async () => {
    playHaptic("DEPLOY");
    try {
      const res = await claimDailyBonus();
      if (res.data.already_used) {
        addNotification({ type: "INFO", message: "Daily bonus already claimed — resets in 24h." });
      } else {
        playHaptic("CREDIT");
        addNotification({ type: "SUCCESS", message: `+${res.data.credits_earned} credits! Daily bonus claimed.` });
        fetchUser();
      }
    } catch {
      addNotification({ type: "ERROR", message: "Couldn't claim bonus, try again." });
    }
  }, [addNotification, fetchUser]);

  const handleSummaryDismiss = useCallback(() => {
    setEarningSummary(null);
    setLevelUpData(null);
    if (pendingLoot) {
      setLoot(pendingLoot);
      setPendingLoot(null);
    }
  }, [pendingLoot]);

  const handleDrop = async () => {
    if (!clerkUser?.id) return;
    setIsOpening(true);
    setLoot(null);
    try {
      const dropRes = await rollLoot();
      setTimeout(() => { setLoot(dropRes.data); setIsOpening(false); }, 2000);
    } catch {
      setIsOpening(false);
    }
  };

  const handleInventoryEquip = useCallback(async (itemOrId) => {
    const targetId = typeof itemOrId === "string"
      ? itemOrId
      : (itemOrId?.instanceId || itemOrId?.id);
    if (!targetId) return;
    try {
      const equipRes = await equipItem(targetId);
      const toggling = typeof itemOrId === "object"
        ? itemOrId
        : inventoryRef.current.find(i => String(i.instanceId) === String(targetId));
      setInventory(prev => prev.map(item => ({ ...item, is_equipped: equipRes.data.equipped_ids.includes(String(item.instanceId)) })));
      if (toggling) {
        if (!toggling.is_equipped) {
          const hint = PERK_EFFECT_HINTS[toggling.name] || toggling.effect_value || "Active";
          addNotification({ type: "SUCCESS", message: `${toggling.name} equipped! ${hint}` });
        } else {
          addNotification({ type: "SUCCESS", message: `${toggling.name} unequipped` });
        }
      }
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;
      const equipErrorMsg =
        status === 400 ? (serverMsg || "Can't equip that right now.") :
        status === 403 ? (serverMsg || "Perk slots full — unequip one first.") :
        "Couldn't equip, try again.";
      addNotification({ type: "ERROR", message: equipErrorMsg });
    }
  }, [addNotification]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchModules()
      .then(res => { setModules(res.data); if (res.data.length > 0) setSelectedModule(res.data[0]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      if (!isLoaded || !clerkUser?.id) return;
      try {
        const invRes = await apiFetchInventory(clerkUser.id);
        setInventory(invRes.data);
      } catch (err) { console.error("FAILED_TO_SYNC_VAULT", err.message); }
    };
    loadInventory();
  }, [isLoaded, clerkUser?.id]);


  useEffect(() => {
    let solarTimer;
    const solarTick = () => { setSolarPhase(getSolarPhase()); solarTimer = setTimeout(solarTick, 60000); };
    const onVisibilityChange = () => {
      if (document.hidden) { clearTimeout(solarTimer); }
      else { setSolarPhase(getSolarPhase()); solarTimer = setTimeout(solarTick, 60000); }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    solarTimer = setTimeout(solarTick, 60000);
    return () => { clearTimeout(solarTimer); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, []);

  useEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      document.documentElement.classList.toggle('device-small', window.innerHeight < 700);
    };
    update();
    let rafId = null;
    const onResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize, { passive: true });
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("payment");
    if (status === "success" || status === "cancelled") {
      setPaymentView(status);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (paymentView !== "success") return;
    const paymentPollInterval = setInterval(fetchUser, 2000);
    return () => clearInterval(paymentPollInterval);
  }, [paymentView]);


  useEffect(() => {
    document.body.className = `phase-${solarPhase} theme-${activeTheme}`;
    document.body.setAttribute("data-solar", solarPhase);
    setPhase(solarPhase);
  }, [solarPhase, activeTheme]);

  // Theme accent is now fully handled by CSS via body.theme-X rules in App.css
  const currentAppHour = new Date().getHours();
  const isRedzone      = currentAppHour >= 0 && currentAppHour < 5;

  // ── Split context values ───────────────────────────────────────────────────
  const userValue = useMemo(() => ({
    user, clerkUser, inventory,
    fetchUser, fetchInventory, handleInventoryEquip, handlePrestige, handleDailyBonus,
    notifications, addNotification,
    getRank, isRedzone,
  }), [user, clerkUser, inventory, fetchUser, fetchInventory, handleInventoryEquip, handlePrestige, handleDailyBonus, notifications, addNotification, isRedzone]);

  const taskValue = useMemo(() => ({
    contracts,
    modules, selectedModule, setSelectedModule,
    isOpening, loot, setLoot,
    previewXP, setPreviewXP,
    previewSkill, setPreviewSkill,
    levelUpSkill, activeSkillName,
    elevationKey, completionTick, chartPending,
    xpGain, xpBurstKey,
    fetchContracts,
    handleComplete, handleAbort, handleInitiate, handleDrop, handleContractCreated,
    getMissionStakes,
    SUBJECT_TO_SKILL_MAP, CONTRACT_TIERS,
  }), [
    contracts,
    modules, selectedModule,
    isOpening, loot,
    previewXP, previewSkill, levelUpSkill, activeSkillName,
    elevationKey, completionTick, chartPending, xpGain, xpBurstKey,
    fetchContracts, handleComplete, handleAbort, handleInitiate, handleDrop, handleContractCreated,
  ]);

  const uiValue = useMemo(() => ({
    solarPhase,
    activeTheme, setActiveTheme,
    activeAmbientTrack, setActiveAmbientTrack,
    atmosphereVolume, handleAtmosphereVolumeChange,
    isInventoryOpen, setIsInventoryOpen,
    playHaptic, navigate,
  }), [solarPhase, activeTheme, activeAmbientTrack, atmosphereVolume, handleAtmosphereVolumeChange, isInventoryOpen, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  if (!isLoaded) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      {/* ── Solar backdrop ── */}
      <SolarBackdrop solarPhase={solarPhase} activeTheme={activeTheme} />

      {/* ── Dynamic weather overlay (rain / snow / storm / clouds) ── */}

      <SignedOut>
        <AuthScreen />
      </SignedOut>

      <SignedIn>
        <ErrorBoundary>
        {banReason ? (
          <div className="loading-screen ban-screen">
            <div className="ban-icon">⚠</div>
            <p className="ban-title">Account Banned!</p>
            <p className="ban-message">{banReason}</p>
            <button className="ban-signout-btn" onClick={() => signOut()}>Sign Out</button>
          </div>
        ) : !user ? (
          <div className="loading-screen">Loading your profile...</div>
        ) : (
          <NavContextProvider>
          <UserContext.Provider value={userValue}>
          <TaskContext.Provider value={taskValue}>
          <UIContext.Provider value={uiValue}>

            {/* ── First-session screen (new users only) ── */}
            {showFirstSession && (
              <FirstSessionScreen
                onStart={handleFirstSessionStart}
                onSkip={handleFirstSessionSkip}
                solarPhase={solarPhase}
                activeTheme={activeTheme}
              />
            )}

            {/* ── Onboarding tour ── */}
            {showOnboarding && (
              <OnboardingModal
                userId={clerkUser.id}
                onClose={() => setShowOnboarding(false)}
                onNavigate={navigate}
              />
            )}

            {/* ── Global overlays (portals) ── */}
            {paymentView === "success" && (
              <PaymentSuccess onContinue={() => { setPaymentView(null); fetchUser(); navigate("/dashboard"); }} />
            )}
            {paymentView === "cancelled" && (
              <PaymentCancel
                onRetry={() => { setPaymentView(null); navigate("/shop"); }}
                onDismiss={() => setPaymentView(null)}
              />
            )}
            {isShatterModalOpen && pendingTask && (
              <ShatterModal
                baseTask={{ title: pendingTask.taskName }}
                onDeploy={subTasks => startShatteredMission(pendingTask, subTasks)}
                onCancel={() => { setIsShatterModalOpen(false); setPendingTask(null); }}
              />
            )}
            {earningSummary && createPortal(
              <EarningSummary data={earningSummary} onDismiss={handleSummaryDismiss} />,
              document.body,
            )}
            {(isOpening || loot) && createPortal(
              <LootDisplay loot={loot} isOpening={isOpening} onDismiss={() => setLoot(null)} />,
              document.body,
            )}
            {prestigeData && (
              <PrestigeCinematic
                skillName={prestigeData.skillName}
                prestigeLevel={prestigeData.prestigeLevel}
                creditReward={prestigeData.creditReward}
                onDismiss={handlePrestigeDismiss}
              />
            )}
            {createPortal(<NotificationCenter notifications={notifications} />, document.body)}

            {/* ── Main OS shell ── */}
            <div
              className={`zenith-os-shell phase-${solarPhase} theme-${activeTheme}${activeSkillName ? " has-aura" : ""}${isRedzone ? " redzone-mode" : ""}`}
              style={{
                "--aura-color": activeSkillName ? (SKILL_COLORS[activeSkillName] ?? "transparent") : "transparent",
              }}
            >
              <NavDrawer />

<main className="zenith-main-content">
                <NavTrigger />
                <Routes>
                    <Route path="/"          element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<div className="page-enter"><DashboardView /></div>} />
                    <Route path="/inventory" element={<div className="page-enter"><VaultPage /></div>} />
                    <Route path="/history"   element={<div className="page-enter"><ArchivesPage /></div>} />
                    <Route path="/shop"      element={<div className="page-enter"><ExchangePage /></div>} />
                    <Route path="/settings"  element={<div className="page-enter"><SettingsPage /></div>} />
                    <Route path="/updates"   element={<div className="page-enter"><ReleaseNotesPage /></div>} />
                    <Route path="/privacy"   element={<div className="page-enter"><PrivacyPage /></div>} />
                    <Route path="/terms"     element={<div className="page-enter"><TermsPage /></div>} />
                    <Route path="*"          element={<Navigate to="/dashboard" replace />} />
                  </Routes>
              </main>
            </div>

          </UIContext.Provider>
          </TaskContext.Provider>
          </UserContext.Provider>
          </NavContextProvider>
        )}
        </ErrorBoundary>
      </SignedIn>
    </>
  );
};

export default App;
