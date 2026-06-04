import React, { useState, useEffect, useRef } from "react";
import { TIME_CONFIG, SKILL_COLORS, SUBJECT_TO_SKILL_MAP } from "../utils/constants";
import { API_BASE } from "../../../src/config";

const SKILL_LIST = [...new Set(Object.values(SUBJECT_TO_SKILL_MAP))];

function getTimeModifier() {
  const hour = new Date().getHours();
  if (hour >= 0  && hour < 7)  return { multiplier: 2.0, rewardMultiplier: 0.5, label: "RED ZONE",  type: "penalty"  };
  if (hour >= 8  && hour < 11) return { multiplier: 0.9, rewardMultiplier: 1.0, label: "PEAK",       type: "bonus"    };
  if (hour >= 14 && hour < 16) return { multiplier: 1.3, rewardMultiplier: 1.0, label: "DRAG",       type: "penalty"  };
  if (hour >= 22)              return { multiplier: 0.8, rewardMultiplier: 1.0, label: "HYPERFOCUS", type: "bonus"    };
  return { multiplier: 1.0, rewardMultiplier: 1.0, label: null, type: "neutral" };
}

const MissionForm = ({
  selectedModule,
  setSelectedModule,
  modules,
  currentLevel,
  userTier,
  getMissionStakes,
  setPreviewXP,
  setPreviewSkill,
  handleInitiate,
  handleDrop,
  playHaptic,
  onContractCreated,
  clerkUser,
  shouldFocusInput,
}) => {
  const isPro = (userTier ?? 0) >= 1;
  const timeState  = getTimeModifier();
  const inputRef   = useRef(null);

  const [localName,     setLocalName]     = useState("");
  const [duration,      setDuration]      = useState(30);
  const [explicitSkill, setExplicitSkill] = useState(null);
  const [isDebugBusy,   setIsDebugBusy]   = useState(false);

  const handleDebug = async () => {
    if (!clerkUser?.id || isDebugBusy) return;
    setIsDebugBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/debug/instant-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: clerkUser.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const task = await res.json();
      onContractCreated(task);
    } catch (err) {
      console.warn("Debug task failed:", err.message);
    } finally {
      setIsDebugBusy(false);
    }
  };

  useEffect(() => {
    if (shouldFocusInput) inputRef.current?.focus();
  }, [shouldFocusInput]);

  return (
    <div className="input-section">
      <span className="selector-label">New Task</span>

      <input
        ref={inputRef}
        className="input-field"
        style={{ fontSize: "0.8rem", opacity: 0.7 }}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        placeholder="Task name..."
      />

      <div className="skill-picker">
        <span className="skill-picker-label">Train Specific Skill {explicitSkill ? `→ ${explicitSkill}` : ""}</span>
        <div className="skill-picker-chips">
          {SKILL_LIST.map(skill => (
            <button
              key={skill}
              type="button"
              className={`skill-chip${explicitSkill === skill ? " active" : ""}`}
              style={{ "--chip-color": SKILL_COLORS[skill.toUpperCase()] }}
              onClick={() => { playHaptic("TICK"); setExplicitSkill(prev => prev === skill ? null : skill); }}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {timeState.label === "RED ZONE" && (
        <div className="redzone-warning">
          <span className="redzone-warning-icon">⚠</span>
          <span>Red Zone — rewards halved. Start tomorrow morning for full gains.</span>
        </div>
      )}

      <div className="duration-grid">
        {[5, 15, 30, 60, 90, 120].map((m) => {
          const locked = m === 120 && !isPro;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (locked) return;
                playHaptic("TICK");
                setDuration(m);
              }}
              onMouseEnter={() => {
                if (locked) return;
                setPreviewXP(getMissionStakes(m));
                setPreviewSkill(explicitSkill || "Resolve");
              }}
              onMouseLeave={() => { setPreviewXP(0); setPreviewSkill(null); }}
              className={`duration-btn${duration === m ? " active" : ""}${m === 120 ? " legendary" : ""}${locked ? " locked-tier" : ""}`}
              title={locked ? "Upgrade to PRO to unlock 120 min sessions" : undefined}
            >
              {locked ? "🔒 PRO" : `${m} MIN`}
            </button>
          );
        })}
      </div>

      {/* Stats for the currently selected duration */}
      {(() => {
        const meta = TIME_CONFIG[duration];
        const cr   = Math.floor(meta.credits * timeState.rewardMultiplier);
        const xp   = getMissionStakes(duration);
        return (
          <p className="duration-info-line">
            <span className="dil-xp">+{xp} XP</span>
            <span className="dil-sep"> · </span>
            <span className="dil-cr">+{cr} CR</span>
            {timeState.label && (
              <span className={`dil-badge ${timeState.type}`}>{timeState.label}</span>
            )}
          </p>
        );
      })()}

      <button
        type="button"
        className={`btn-primary${localName.trim() ? " btn-ready" : ""}`}
        onClick={() => {
          handleInitiate(localName, "", explicitSkill, duration);
          if (localName.trim()) { setLocalName(""); setDuration(30); setExplicitSkill(null); }
        }}>
        Begin ⚡
      </button>

      {import.meta.env.DEV && (
        <button
          type="button"
          className="btn-debug"
          disabled={isDebugBusy}
          onClick={handleDebug}>
          {isDebugBusy ? "Creating…" : "⚙ Debug: Instant Task"}
        </button>
      )}
    </div>
  );
};

export default MissionForm;
