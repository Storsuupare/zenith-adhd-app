import React from "react";

const KineticOverlay = ({ activeMission, timeLeft, handleComplete, handleAbort }) => {
  if (!activeMission) return null;

  const totalSeconds = activeMission.totalSeconds ?? (activeMission.duration_minutes * 60);
  const progress = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
  const isUnlocked = timeLeft === 0;

  const fmt = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="kinetic-focus-overlay">
      <div className="kinetic-content">

        <div className="focus-header">
          <span className="mission-id">[{activeMission.id}]</span>
          <span className="kinetic-status">
            OBJECTIVE // {activeMission.task_name ?? activeMission.taskName}
          </span>
        </div>

        <div className="timer-portal">
          <svg viewBox="0 0 100 100" className="timer-svg">
            <circle className="portal-bg" cx="50" cy="50" r="48" />
            <circle
              className="portal-fill"
              cx="50"
              cy="50"
              r="48"
              style={{
                strokeDasharray: 301.59,
                strokeDashoffset: 301.59 - 301.59 * progress,
              }}
            />
          </svg>
          <div className="portal-readout">
            <h1 className={`massive-countdown ${timeLeft < 60 ? "critical-pulse" : ""}`}>
              {fmt(timeLeft)}
            </h1>
            <span className="portal-label">TIME REMAINING</span>
          </div>
        </div>

        <div className="focus-actions-vertical">
          <button
            className={`btn-action primary ${!isUnlocked ? "system-locked" : ""}`}
            disabled={!isUnlocked}
            onClick={() => handleComplete(activeMission.id)}
          >
            {isUnlocked ? "TERMINATE MISSION" : "PROTOCOL LOCKED"}
          </button>

          <button
            className="btn-action abort"
            onClick={() => handleAbort(activeMission.id)}
          >
            ABORT MISSION ×
          </button>
        </div>

      </div>
    </div>
  );
};

export default KineticOverlay;