import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/clerk-react";
import axios from "axios";
import "./App.css";
import "../clerk-react/src/components/StatHUD.css";
import "../clerk-react/src/components/SkillSideBar.css";
import "../clerk-react/src/components/NotificationCenter.css";
import "../clerk-react/src/components/MissionForm.css";
import "../clerk-react/src/components/LootDisplay.css";
import "../clerk-react/src/components/KineticOverlay.css";
import "../clerk-react/src/components/InventoryItem.css";
import "../clerk-react/src/components/ContractCard.css";
import "../clerk-react/src/components/VolumeSlider.css";
import "../clerk-react/src/components/SystemResourceHUD.css";
import "../clerk-react/src/components/ShopModal.css";
import ContractCard from "../clerk-react/src/components/ContractCard";
import SystemResourceHUD from "../clerk-react/src/components/SystemResourceHUD";
import ShopModal from "../clerk-react/src/components/ShopModal";
import VolumeSlider from "../clerk-react/src/components/VolumeSlider";
import { prime, setPhase, setProtocol } from "./audio/audioEngine";
import SkillSidebar from "../clerk-react/src/components/SkillSidebar";
import MissionForm from "../clerk-react/src/components/MissionForm";
import StatHUD from "../clerk-react/src/components/StatHUD";
import KineticOverlay from "../clerk-react/src/components/KineticOverlay";
import LootDisplay from "../clerk-react/src/components/LootDisplay";
import NotificationCenter from "../clerk-react/src/components/NotificationCenter";
import InventoryItem from "../clerk-react/src/components/InventoryItem";

const SUBJECT_TO_SKILL_MAP = {
  Python:                  "Logic Flow",
  React:                   "Logic Flow",
  SQL:                     "Logic Flow",
  "Code Review":           "Logic Flow",
  "Algorithm Design":      "Logic Flow",
  "System Architecture":   "Logic Flow",
  "Data Analysis":         "Logic Flow",
  "Chess":                  "Logic Flow",
  "Project Roadmapping":   "Logic Flow",
  "Puzzle Operations":     "Logic Flow",
  "Legal Analysis":        "Logic Flow",
  "Debate Briefing":       "Logic Flow",
  "Strategic Planning":    "Logic Flow",
  "Network Architecture":  "Logic Flow",

  Gym:                     "Vitality",
  Walking:                 "Vitality",
  Swimming:                "Vitality",
  Cycling:                 "Vitality",
  "Combat Training":       "Vitality",
  "Endurance Protocol":    "Vitality",
  "Mobility Sequence":     "Vitality",
  "Cold Exposure":         "Vitality",
  "Sprint Intervals":      "Vitality",
  "Strength Circuit":      "Vitality",

  Water:                   "Nutrition",
  "Fuel Synthesis":        "Nutrition",
  "Macro Calibration":     "Nutrition",
  "Ration Prep":           "Nutrition",
  "Supplement Protocol":   "Nutrition",
  "Dietary Audit":         "Nutrition",
  "Fasting Protocol":      "Nutrition",

  Cleaning:                "Environment",
  Laundry:                 "Environment",
  "Space Optimization":    "Environment",
  "Digital Purge":         "Environment",
  "Field Repair":          "Environment",
  "Workspace Config":      "Environment",
  "Supply Run":            "Environment",

  "Deep Work":             "Deep Focus",
  "Flow State Session":    "Deep Focus",
  "Isolation Sprint":      "Deep Focus",
  "Single-Task Protocol":  "Deep Focus",
  "Maker Block":           "Deep Focus",
  "Zero-Interrupt Zone":   "Deep Focus",

  Reading:                 "Synthesis",
  "Philosophy Study":      "Synthesis",
  "Research & Intel":      "Synthesis",
  "Note Consolidation":    "Synthesis",
  "Concept Mapping":       "Synthesis",
  "Case Study Review":     "Synthesis",
  "Language Acquisition":  "Synthesis",
  "Science Study":         "Synthesis",
  "History Analysis":      "Synthesis",

  Admin:                   "Logistics",
  "Inbox Zero":            "Logistics",
  "Calendar Ops":          "Logistics",
  "Task Triage":           "Logistics",
  "Supply Chain":          "Logistics",
  "Document Processing":   "Logistics",
  "System Maintenance":    "Logistics",

  Writing:                 "Creative",
  "Signal Design":         "Creative",
  "Audio Production":      "Creative",
  "Visual Storytelling":   "Creative",
  "Ideation Sprint":       "Creative",
  "Interface Design":      "Creative",
  "Worldbuilding":         "Creative",
  "Music Composition":     "Creative",

  Bills:                   "Wealth",
  "Financial Audit":       "Wealth",
  "Investment Review":     "Wealth",
  "Revenue Protocol":      "Wealth",
  "Asset Mapping":         "Wealth",
  "Tax Operations":        "Wealth",
  "Budget Calibration":    "Wealth",

  Social:                  "Presence",
  "Network Deployment":    "Presence",
  "Mentorship Protocol":   "Presence",
  "Community Signal":      "Presence",
  "Bond Maintenance":      "Presence",
  "Public Address":        "Presence",
  "Conflict Resolution":   "Presence",

  Meditation:              "Restoration",
  Journaling:              "Restoration",
  "Sleep Protocol":        "Restoration",
  "Breath Work":           "Restoration",
  "Neural Recovery":       "Restoration",
  "Nature Immersion":      "Restoration",
  "Sensory Deprivation":   "Restoration",
  "Passive Decompression": "Restoration",

  "Hard Task":             "Resolve",
  "Morning Offensive":     "Resolve",
  "Cold Protocol":         "Resolve",
  "Discomfort Training":   "Resolve",
  "Rejection Drill":       "Resolve",
  "High-Stakes Execution": "Resolve",
  "Accountability Check":  "Resolve",
  "Fear Confrontation":    "Resolve",
};

let audioCtx = null; 

const App = () => {
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [inventory, setInventory] = useState([]);

  const { user: clerkUser, isLoaded } = useUser();

  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(30);
  const [skills, setSkills] = useState([]);

  const [streak, setStreak] = useState(0);
  const [isVitiated, setIsVitiated] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [previewSkill, setPreviewSkill] = useState(null);
  const [previewXP, setPreviewXP] = useState(0);

  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isPlanningMode, setIsPlanningMode] = useState(false);

  const [isKineticMode, setIsKineticMode] = useState(false);
  const [activeMission, setActiveMission] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [focusedContract, setFocusedContract] = useState(null);
  const [liveTime, setLiveTime] = useState(0);

  const [levelUpData, setLevelUpData] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [loot, setLoot] = useState(null);

  const [sysRefreshKey, setSysRefreshKey] = useState(0);
  const [isShopOpen,   setIsShopOpen]   = useState(false);

  const fetchUser = async () => {
    if (!clerkUser?.id) return;

    try {
      console.log("FETCHING OPERATOR DATA...");
      const res = await axios.get(`http://localhost:5000/user/${clerkUser.id}`);

      if (res.data) {
        setUser(res.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        console.log("OPERATOR NOT FOUND. INITIALIZING NEW DATABASE ENTRY...");
        try {
          const createRes = await axios.post(`http://localhost:5000/user`, {
            clerkId: clerkUser.id,
            username: clerkUser.username || "Recruit",
            email: clerkUser.primaryEmailAddress?.emailAddress,
          });
          setUser(createRes.data);
        } catch (postErr) {
          console.error("INITIALIZATION_FAILED:", postErr.message);
        }
      } else {
        console.error("CRITICAL_FETCH_ERROR:", err.message);
      }
    }
  };

  useEffect(() => {
    if (isLoaded && clerkUser?.id) {
      fetchUser();
    }
  }, [isLoaded, clerkUser?.id]);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!isLoaded || !clerkUser?.id) return;
      try {
        const res = await axios.get(
          `http://localhost:5000/api/contracts?externalId=${clerkUser.id}`,
        );
        setContracts(res.data);
      } catch (err) {
        console.error("CONTRACT_SYNC_ERROR", err);
      }
    };
    fetchContracts();
  }, [isLoaded, clerkUser?.id]);

  const handleContractCreated = (newContract) => {
    setContracts((prev) => [...prev, newContract]);
  };

  const getMissionStakes = (duration) => {
    const stakes = {
      5: 250,
      15: 1200,
      30: 4000,
      60: 10000,
      90: 15800,
      120: 30000,
      0.1666: 9999,
    };
    return stakes[duration] || Math.floor(duration * 10);
  };

  const playHaptic = async (type, level = 1) => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    const createTone = (
      freq,
      startOffset,
      duration,
      waveType = "square",
      volume = 0.1,
      rampTo = 1.2,
    ) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = waveType;
      o.frequency.setValueAtTime(freq, now + startOffset);
      o.frequency.exponentialRampToValueAtTime(
        freq * rampTo,
        now + startOffset + duration,
      );
      g.gain.setValueAtTime(volume, now + startOffset);
      g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + startOffset);
      o.stop(now + startOffset + duration);
    };

    const makeNoise = (startOffset, duration, volume) => {
      const src = audioCtx.createBufferSource();
      const sz = Math.floor(audioCtx.sampleRate * duration);
      const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1;
      src.buffer = buf;
      const gn = audioCtx.createGain();
      gn.gain.setValueAtTime(volume, now + startOffset);
      gn.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
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
        const spool = audioCtx.createOscillator();
        const spoolG = audioCtx.createGain();
        spool.type = "square";
        spool.frequency.setValueAtTime(100, now);
        spool.frequency.exponentialRampToValueAtTime(700, now + 0.14);
        spoolG.gain.setValueAtTime(0.07, now);
        spoolG.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        spool.connect(spoolG).connect(audioCtx.destination);
        spool.start(now); spool.stop(now + 0.14);
        createTone(900,  0.15, 0.05, "sine", 0.1,  1.0);
        createTone(1350, 0.17, 0.04, "sine", 0.06, 1.0);
        createTone(65,   0.21, 0.4,  "sawtooth", 0.18, 0.45);
        createTone(130,  0.21, 0.12, "square",   0.07, 0.75);
        break;
      }

      case "VAULT_OPEN": {
        createTone(95,   0,    0.12, "sawtooth", 0.14, 0.5);
        createTone(75,   0.08, 0.22, "square",   0.09, 0.55);
        createTone(3400, 0.07, 0.35, "sine",     0.03, 0.84);
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
        const sweep = audioCtx.createOscillator();
        const sweepG = audioCtx.createGain();
        sweep.type = "sawtooth";
        sweep.frequency.setValueAtTime(380, now + 0.33);
        sweep.frequency.exponentialRampToValueAtTime(32, now + 0.9);
        sweepG.gain.setValueAtTime(0.18, now + 0.33);
        sweepG.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        sweep.connect(sweepG).connect(audioCtx.destination);
        sweep.start(now + 0.33); sweep.stop(now + 0.9);
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

      case "SCRAP": {
        createTone(580, 0,    0.09, "sawtooth", 0.07, 0.38);
        createTone(380, 0.07, 0.09, "sawtooth", 0.07, 0.38);
        createTone(2600, 0,   0.13, "sine",     0.02, 0.7);
        makeNoise(0, 0.1, 0.02);
        break;
      }

      case "PRESTIGE_ASCENT": {
        const turbine = audioCtx.createOscillator();
        const tGain = audioCtx.createGain();
        turbine.type = "sawtooth";
        turbine.frequency.setValueAtTime(40, now);
        turbine.frequency.exponentialRampToValueAtTime(1200, now + 1.3);
        tGain.gain.setValueAtTime(0, now);
        tGain.gain.linearRampToValueAtTime(0.14, now + 0.65);
        tGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        turbine.connect(tGain).connect(audioCtx.destination);
        turbine.start(now); turbine.stop(now + 1.3);
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

      default: break;
    }
  };

  const handleInitiate = async () => {
    const numericDuration = Number(duration);
    const currentStake = getMissionStakes(numericDuration);

    if (!taskName.trim() || !clerkUser?.id) {
      console.error("START_FAILED: Missing task or Clerk Identity.");
      return;
    }

    playHaptic("DEPLOY");

    try {
      const candidates = [
        selectedModule?.subject,
        taskName.trim(),
        taskName.trim().split(":")[0].trim(),
      ].filter(Boolean);
      let skillName = null;
      for (const c of candidates) {
        const hit = Object.entries(SUBJECT_TO_SKILL_MAP).find(
          ([k]) => k.toLowerCase() === c.toLowerCase()
        );
        if (hit) { skillName = hit[1]; break; }
      }

      const response = await axios.post("http://localhost:5000/api/contracts", {
        externalId: clerkUser.id,
        taskName: taskName.trim(),
        durationMinutes: numericDuration,
        stakeAmount: currentStake,
        skillName: skillName || null,
      });

      setContracts((prev) => [...prev, response.data]);
      await fetchUser();

      if (isKineticMode) {
        const totalSeconds = Math.floor(numericDuration * 60);
        setActiveMission({
          id: response.data.id,
          taskName: taskName.trim(),
          totalSeconds: totalSeconds,
          isKinetic: true,
        });
        setTimeLeft(totalSeconds);
      }

      setTaskName("");
      setPreviewXP(0);
      console.log("DEPLOYMENT_SUCCESSFUL:", response.data);
    } catch (err) {
      console.error("START_FAILED:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    if (!activeMission?.isKinetic || timeLeft <= 0) return;

    const endAt = Date.now() + timeLeft * 1000;
    let timerId;

    const tick = () => {
      const remaining = Math.ceil((endAt - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));
      if (remaining > 0) timerId = setTimeout(tick, 1000);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timerId);
      } else {
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    timerId = setTimeout(tick, 1000);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeMission?.isKinetic]);

  const addNotification = (notif) => {
    const id = Date.now();
    const newNotif = { ...notif, id };

    setNotifications((prev) => [newNotif, ...prev].slice(0, 5));

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const handleComplete = async (contractId) => {
    if (!clerkUser?.id || isOpening) return;

    try {
      setIsOpening(true);

      const res = await axios.post(
        `http://localhost:5000/api/contracts/${contractId}/complete`,
        { externalId: clerkUser.id },
      );

      playHaptic("SUCCESS");

      const {
        reward,
        user: updatedUser,
        drop,
        leveledUp,
        newLevel,
      } = res.data;

      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updatedUser,
          mastery: prev.mastery || [],
        };
      });



      if (drop) {
        setInventory((prev) => [...prev, drop]);
        setLoot(drop);
        addNotification({
          type: "SUCCESS",
          message: `You found: ${drop.name}!`,
        });
      }

      if (leveledUp) {
        addNotification({
          type: "LEVEL_UP",
          message: `Level up! You're now level ${newLevel} ✨`,
        });
        if (typeof playHaptic === "function") playHaptic("LEVEL_UP");
      }

      setContracts((prev) =>
        prev.filter((c) => String(c.id) !== String(contractId)),
      );

      setPreviewXP(0);
      setPreviewSkill(null);
      setActiveMission(null);

      addNotification({
        type: "SUCCESS",
        message: `Nice work! +${reward} XP earned`,
      });

      await fetchUser();

      // Apply system-level rewards (+500 cr, +100 xp, -15 bw) then re-sync HUD
      try {
        await axios.post("http://localhost:8000/system/contract-reward", {
          clerk_id: clerkUser.id,
        });
      } catch (rewardErr) {
        console.warn("[SYSTEM] Contract reward failed:", rewardErr.message);
      }
      setSysRefreshKey((k) => k + 1);

      setIsOpening(false);
    } catch (err) {
      setIsOpening(false);
      console.error(
        "CRITICAL_SYNC_FAILURE:",
        err.response?.data || err.message,
      );
      addNotification({ type: "ERROR", message: "Couldn't sync — try again" });
    }
  };

  const handleAbort = async (contractId) => {
    playHaptic("ABORT");
    setIsVitiated(true);

    try {
      const res = await axios.post(
        `http://localhost:5000/api/contracts/${contractId}/fail`,
      );

      const updatedUser = res.data;

      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updatedUser,
          contracts: (prev.contracts || []).filter((c) => c.id !== contractId),
        };
      });

      addNotification({
        type: "CRITICAL",
        message: "Session ended — no worries, keep going 💙",
      });

      setTimeout(() => {
        setActiveMission(null);
        setIsVitiated(false);
        setContracts((prev) => prev.filter((c) => c.id !== contractId));
        setPreviewXP(0);
        setPreviewSkill(null);
      }, 1000);
    } catch (err) {
      console.error("ABORT SYNC FAILURE", err);
      setIsVitiated(false);
      setActiveMission(null);
      addNotification({ type: "ERROR", message: "Couldn't end session — try again" });
    }
  };

  useEffect(() => {
    const recoverMission = async () => {
      if (!user?.id) return;

      try {
        const res = await axios.get(
          `http://localhost:5000/api/contracts/active/${user.id}`,
        );

        const mission = Array.isArray(res.data) ? res.data[0] : res.data;

        if (!mission) return;

        const deadlineMs = Date.parse(mission.deadline);
        const nowMs = Date.now();

        if (isNaN(deadlineMs)) {
          console.warn("Invalid deadline received from server");
          return;
        }

        const secondsRemaining = Math.floor((deadlineMs - nowMs) / 1000);

        console.log("ZENITH_SYNC:", {
          task: mission.taskName,
          diff: secondsRemaining,
        });

        if (secondsRemaining > 0) {
          setActiveMission({ ...mission, isKinetic: true });
          setTimeLeft(secondsRemaining);

          console.log(
            `[RECOVERED] ${secondsRemaining}s left on: ${mission.taskName}`,
          );
        } else {
          console.log(
            "Mission expired during downtime. Ready for new contracts.",
          );
          setActiveMission(null);
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error("CRITICAL_RECOVERY_FAILURE:", err.message);
        }
      }
    };

    recoverMission();
  }, [user?.id]);

  const handlePrestige = async (skillName) => {
    playHaptic("PRESTIGE_ASCENT");

    try {
      const res = await axios.post("http://localhost:5000/skills/prestige", {
        skillName: skillName,
      });

      if (res.data.success) {
        addNotification({
          type: "PRESTIGE",
          message: `${skillName} prestiged! Fresh start 🌟`,
        });

        if (res.data.newItem) {
          setInventory((prev) => [...prev, res.data.newItem]);
        }

        addNotification({
          type: "LOOT",
          message: `Prestige reward unlocked: ${res.data.reward}`,
        });

        fetchUser();
      }
    } catch (err) {
      addNotification({
        type: "ERROR",
        message: err.response?.data?.error || "Prestige failed — try again",
      });
    }
  };

  const handleDrop = async () => {
    if (!clerkUser?.id) return;
    setIsOpening(true);
    setLoot(null);

    try {
      const response = await fetch("http://localhost:5000/api/v1/loot/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: clerkUser.id }),
      });

      const data = await response.json();

      setTimeout(() => {
        setLoot(data.item);
        setIsOpening(false);
      }, 2000);
    } catch (err) {
      console.error("Drop failed!", err);
      setIsOpening(false);
    }
  };

  const handleScrap = async (instanceId) => {
    if (!user || isOpening) return;
    playHaptic("SCRAP");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/inventory/scrap",
        {
          userId: user.id,
          instanceId: instanceId,
        },
      );

      if (res.data.success) {
        setUser((prev) => ({
          ...prev,
          ...res.data.user,
        }));

        setInventory((prev) =>
          prev.filter((item) => item.instanceId !== instanceId),
        );

        addNotification({
          type: "SUCCESS",
          message: `Recycled for +${res.data.reward} XP!`,
        });
      }
    } catch (err) {
      console.error("SCRAP ISSUE:", err);
      addNotification({ type: "ERROR", message: "Couldn't recycle right now! Try again later!" });
    }
  };

  const handleTick = (contract, time) => {
    setTimeout(() => {
      setFocusedContract(contract);
      setLiveTime(time);
    }, 0);
  };

  useEffect(() => {
    fetch("http://localhost:5000/modules")
      .then((res) => res.json())
      .then((data) => {
        setModules(data);
        if (data.length > 0) setSelectedModule(data[0]);
      })
      .catch((err) => console.error("INTEL FETCH FAILED!!", err));
  }, []);

  const handleInventoryEquip = async (itemOrId) => {
    // 1. Extract the ID based on your table headers
    const targetId =
      typeof itemOrId === "string"
        ? itemOrId
        : itemOrId?.instanceId || itemOrId?.id;

    const targetUserId = user?.id || 1;

    if (!targetId) {
      console.error("FAILURE: No ID detected. Looking for 'instanceId'.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/inventory/equip",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: targetUserId,
            instanceId: targetId,
          }),
        },
      );

      if (response.ok) {
        setInventory((prevItems) => {
          return prevItems.map((item) => ({
            ...item,
            is_equipped: String(item.instanceId) === String(targetId),
          }));
        });
        console.log(`SUCCESS! Protocol ${targetId} is now active.`);
      } else {
        console.warn("SERVER REJECTED EQUIP COMMAND!");
      }
    } catch (err) {
      console.error("FATAL NETWORK ERROR:", err);
    }
  };

  useEffect(() => {
    const fetchInventory = async () => {
      if (!isLoaded || !clerkUser?.id) return;

      try {
        const res = await axios.get(
          `http://localhost:5000/api/inventory/${clerkUser.id}`,
        );

        console.log("VAULT_SYNCED:", res.data.length, "items found.");
        setInventory(res.data);
      } catch (err) {
        console.error(
          "FAILED_TO_SYNC_VAULT",
          err.response?.data || err.message,
        );
      }
    };

    fetchInventory();
  }, [isLoaded, clerkUser?.id]);

  const getRank = (lvl) => {
    if (lvl < 10) return "DRIFTER";
    if (lvl < 20) return "OBSERVER";
    if (lvl < 40) return "ARCHITECT";
    if (lvl < 60) return "CATALYST";
    if (lvl < 80) return "OVERSEER";
    if (lvl < 99) return "SOVEREIGN";
    return "ZENITH";
  };

  const CONTRACT_TIERS = [
    { mins: 5, xp: 250, req: 1 },
    { mins: 15, xp: 1200, req: 1 },
    { mins: 30, xp: 4000, req: 1 },
    { mins: 60, xp: 10000, req: 20 },
    { mins: 90, xp: 15800, req: 30 },
    { mins: 120, xp: 30000, req: 40 },
  ];

  const getSolarPhase = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return "morning";
    if (hour >= 8 && hour < 12) return "day";
    if (hour >= 12 && hour < 14) return "noon";
    if (hour >= 14 && hour < 18) return "evening";
    if (hour >= 18 && hour < 21) return "sunset";
    return "night";
  };

  const [solarPhase, setSolarPhase] = useState(getSolarPhase());

  useEffect(() => {
    let timerId;

    const tick = () => {
      setSolarPhase(getSolarPhase());
      timerId = setTimeout(tick, 60000);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timerId);
      } else {
        setSolarPhase(getSolarPhase());
        timerId = setTimeout(tick, 60000);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    timerId = setTimeout(tick, 60000);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => { prime(); }, []);

  useEffect(() => {
    document.body.className = `phase-${solarPhase}`;
    setPhase(solarPhase);
  }, [solarPhase]);

  useEffect(() => { setProtocol(isKineticMode); }, [isKineticMode]);

  const showClouds = solarPhase === "morning" || solarPhase === "day";
  const showNight = solarPhase === "night";
  const showSun = solarPhase !== "night";

  const stars = React.useMemo(() => {
    if (!showNight) return [];
    return Array.from({ length: 60 }, (_, i) => ({
      x: (i * 37) % 100,
      y: (i * 53) % 90,
      delay: (i * 0.37) % 4,
      size: 1 + ((i * 7) % 3),
    }));
  }, [showNight]);

  if (!isLoaded)
    return <div className="loading-screen">Loading Zenith Engine...</div>;

  return (
    <div className={`dashboard-layout phase-${solarPhase}`}>
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
                <span key={i} className="star" style={{
                  left: `${s.x}%`, top: `${s.y}%`,
                  width: `${s.size}px`, height: `${s.size}px`,
                  animationDelay: `${s.delay}s`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <SignedOut>
        <div className="auth-hero">
          <h1>ZENITH</h1>
          <p>NEURAL LINK DISCONNECTED</p>
          <SignInButton mode="modal">
            <button className="btn-initiate">ESTABLISH CONNECTION</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {!user ? (
          <div className="loading-screen">SYNCING BIOMETRICS...</div>
        ) : (
          <>
            {/* KINETIC OVERLAY */}
            {activeMission?.isKinetic &&
              createPortal(
                <KineticOverlay
                  activeMission={activeMission}
                  timeLeft={timeLeft}
                  handleComplete={handleComplete}
                  handleAbort={handleAbort}
                />,
                document.body,
              )}

            {/* DASHBOARD */}
            <>
              <NotificationCenter notifications={notifications} />

              <ShopModal
                clerkId={clerkUser?.id}
                isOpen={isShopOpen}
                onClose={() => setIsShopOpen(false)}
                onPurchaseComplete={() => setSysRefreshKey((k) => k + 1)}
                playHaptic={playHaptic}
              />

              <div className="mission-control-column">
                <InventoryItem
                  inventory={inventory}
                  onScrap={handleScrap}
                  onEquip={handleInventoryEquip}
                  playHaptic={playHaptic}
                  onShopOpen={() => setIsShopOpen(true)}
                />

                {(() => {
                  const lvl = user.level || 1;
                  const nextLvlXP = Math.floor(Math.pow(lvl, 2) * 500 + 1000);
                  const withinLvlXP = Math.min(user.xp || 0, nextLvlXP);
                  return (
                    <StatHUD
                      currentLevel={lvl}
                      totalXP={user.total_xp || 0}
                      currentLevelXP={withinLvlXP}
                      nextLevelXP={nextLvlXP}
                      progressPercent={(withinLvlXP / nextLvlXP) * 100}
                      previewXP={previewXP}
                      streak={user.streak || 0}
                      xpRemaining={nextLvlXP - withinLvlXP}
                      getRank={getRank}
                    />
                  );
                })()}

                <SystemResourceHUD
                  clerkId={clerkUser?.id}
                  refreshKey={sysRefreshKey}
                />

                {/* THE ONLY PLACE AUDIO LIVES NOW */}
                <MissionForm
                  isKineticMode={isKineticMode}
                  setIsKineticMode={setIsKineticMode}
                  selectedModule={selectedModule}
                  setSelectedModule={setSelectedModule}
                  taskName={taskName}
                  setTaskName={setTaskName}
                  duration={duration}
                  setDuration={setDuration}
                  modules={modules}
                  currentLevel={user.level || 1}
                  getMissionStakes={getMissionStakes}
                  setPreviewXP={setPreviewXP}
                  setPreviewSkill={setPreviewSkill}
                  SUBJECT_TO_SKILL_MAP={SUBJECT_TO_SKILL_MAP}
                  handleInitiate={handleInitiate}
                  handleDrop={handleDrop}
                  playHaptic={playHaptic}
                  onContractCreated={handleContractCreated}
                  clerkUser={clerkUser}
                />

                <div className="logs-section">
                  <h3 className="section-title">ACTIVE MISSIONS</h3>
                  {contracts && contracts.length > 0 ? (
                    contracts.map((c) => (
                      <ContractCard
                        key={c.id}
                        contract={c}
                        onComplete={handleComplete}
                        onAbort={handleAbort}
                        onHover={setPreviewSkill}
                        onLeave={() => setPreviewSkill(null)}
                        onTick={handleTick}
                      />
                    ))
                  ) : (
                    <div className="empty-state">NO ACTIVE MISSIONS.</div>
                  )}
                </div>
              </div>

              {/* SKILL SIDEBAR STANDALONE */}
              <SkillSidebar
                skills={user.mastery || []}
                previewSkill={previewSkill}
                previewXP={previewXP}
                handlePrestige={handlePrestige}
                solarPhase={solarPhase}
                isProtocolActive={isKineticMode}
                playHaptic={playHaptic}
              />
            </>

            {/* LOOT OVERLAY */}
            {(isOpening || loot) && (
              <LootDisplay
                loot={loot}
                isOpening={isOpening}
                onDismiss={() => setLoot(null)}
                userId={clerkUser?.id}
              />
            )}
          </>
        )}
      </SignedIn>
    </div>
  );
};

export default App;
