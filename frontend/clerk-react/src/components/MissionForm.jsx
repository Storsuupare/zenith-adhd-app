import React from "react";
import VolumeSlider from './VolumeSlider';


const MissionForm = ({
  isKineticMode,
  setIsKineticMode,
  selectedModule,
  setSelectedModule,
  taskName,
  setTaskName,
  duration,
  setDuration,
  modules,
  currentLevel,
  getMissionStakes,
  setPreviewXP,
  setPreviewSkill,
  SUBJECT_TO_SKILL_MAP,
  handleInitiate,
  handleDrop,
  playHaptic,
  onContractCreated,
  clerkUser,
}) => {
  return (
    <div className="input-section">
      <div className="mission-parameters-header">
        <div className="toggle-container">
          <label className="zenith-switch">
            <input
              type="checkbox"
              checked={isKineticMode}
              onChange={() => {
                playHaptic("HISS");
                setIsKineticMode(!isKineticMode);
              }}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label">
            {isKineticMode
              ? "KINETIC MODE: DISTANCE FOCUS"
              : "DASHBOARD MODE: DESK FOCUS"}
              
          </span>
          <div className="mission-audio-link">
          <span className="volume-icon" title="Neural Audio Volume">🔊</span>
          </div>
          <VolumeSlider />
        </div>

        
        
      </div>

      <span className="selector-label">SELECT TARGET OBJECTIVE</span>

      <select
        className="input-field"
        value={selectedModule?.id || ""}
        onChange={(e) => {
          const mod = modules.find((m) => m.id === parseInt(e.target.value));
          setSelectedModule(mod);
          setTaskName(`${mod.subject}: ${mod.topic}`);
        }}>
        <option value="" disabled>
          --- SELECT MISSION ---
        </option>
        {modules.map((mod) => (
          <option key={mod.id} value={mod.id}>
            [{mod.subject}] {mod.topic}
          </option>
        ))}
      </select>

      <input
        className="input-field"
        style={{ fontSize: "0.8rem", opacity: 0.7 }}
        placeholder="Or type manual objective..."
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
      />

      <div className="duration-grid">
        {[5, 15, 30, 60, 90, 120].map((m) => {
          const requirements = { 90: 30, 120: 40 };
          const isLocked = requirements[m] && currentLevel < requirements[m];

          return (
            <button
              key={m}
              disabled={isLocked}
              onClick={() => { if (!isLocked) { playHaptic("TICK"); setDuration(m); } }}
              onMouseEnter={() => {
                if (!isLocked) {
                  const stakes = getMissionStakes(m);
                  setPreviewXP(stakes);
                  setPreviewSkill(
                    SUBJECT_TO_SKILL_MAP[selectedModule?.subject] || "Resolve",
                  );
                }
              }}
              onMouseLeave={() => {
                setPreviewXP(0);
                setPreviewSkill(null);
              }}
              className={`duration-btn ${duration === m ? "active" : ""} ${isLocked ? "locked-tier" : ""}`}>
              {isLocked ? (
                <span className="lock-label">LVL {requirements[m]} 🔒</span>
              ) : (
                <>
                  {m}MIN
                  <span className="btn-xp-tag">+{getMissionStakes(m)}</span>
                </>
              )}
            </button>
          );
        })}

        <button
          onClick={() => setDuration(0.1666)}
          className="duration-btn debug-btn"
          style={{
            borderColor: "var(--zenith-red)",
            color: "var(--zenith-red)",
          }}>
          DEBUG
        </button>
      </div>

      <button className="btn-primary" onClick={handleInitiate}>
        Go. ⚡
      </button>
    </div>
  );
};

export default MissionForm;
