import React, { useState, useEffect } from "react";
import "../App.css";

const ContractCard = ({
  contract,
  onComplete,
  onAbort,
  onHover,
  onLeave,
  onTick,
  isKineticMode,
}) => {
  const duration = Number(
    contract.duration_minutes || contract.durationMinutes || 30,
  );
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);

  // SVG Circle Math
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / (duration * 60);
  const dashOffset = circumference * (1 - progress);

  // 1. Sync timer when contract changes
  useEffect(() => {
    setTimeLeft(duration * 60);
    setIsRunning(false);
  }, [contract.id, duration]);

  // 2. The Universal Ticker — setTimeout so it doesn't recreate a new interval every second
  useEffect(() => {
    if (timeLeft <= 0 || (isKineticMode && !isRunning)) return;

    const ticker = setTimeout(() => {
      setTimeLeft((prev) => {
        const newTime = prev <= 1 ? 0 : prev - 1;
        if (onTick) onTick(contract, newTime);
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(ticker);
  }, [timeLeft, isKineticMode, isRunning]);

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isLocked = timeLeft > 0;

  return (
    <div
      className={`contract-card ${isLocked && (isRunning || !isKineticMode) ? "system-locked" : ""}`}
      onMouseEnter={() =>
        !isLocked && onHover(contract.skillType, contract.stakeAmount)
      }
      onMouseLeave={onLeave}>
      <div className="card-accent-bar"></div>

      {/* KINETIC CIRCLE: Only visible in Kinetic Mode */}
      {isKineticMode && (
        <div className="timer-container-visual">
          <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={timeLeft < 60 ? "#ff4444" : "#00ffcc"}
              strokeWidth="4"
              strokeDasharray={circumference}
              style={{
                strokeDashoffset: isRunning ? dashOffset : 0,
                transition: "stroke-dashoffset 1s linear",
              }}
              strokeLinecap="round"
            />
          </svg>
          <div className="timer-display-overlay">{formatTime(timeLeft)}</div>
        </div>
      )}

      <div className="card-main-content">
        <div className="mission-header">
          <span className="mission-id">[{contract.id}]</span>
          <span className="skill-tag">
            {contract.task_name ? contract.task_name.split(":")[0] : "Resolve"}
          </span>{" "}
        </div>

        <h4 className="mission-title">
          {contract.task_name || contract.taskName}
        </h4>
        <div className="mission-data-grid">
          {/* NORMAL TIME DISPLAY: Visible when NOT in Kinetic Mode */}
          {!isKineticMode && (
            <div
              className={`data-node ${timeLeft < 60 ? "critical-pulse" : ""}`}>
              <span className="label">TIME LEFT:</span>
              <span className="value">{formatTime(timeLeft)}</span>
            </div>
          )}

          <div className="data-node reward">
            <span className="label">REWARD:</span>
            <span className="value">
              +{contract.stake_amount || contract.stakeAmount} XP
            </span>{" "}
          </div>
        </div>
      </div>

      <div className="card-actions-vertical">
        {isKineticMode && !isRunning && isLocked ? (
          <button
            className="btn-action primary kinetic-pulse"
            onClick={() => setIsRunning(true)}>
            INITIALIZE
          </button>
        ) : (
          <button
            className="btn-action primary"
            onClick={() => onComplete(String(contract.id))}
            disabled={isLocked}>
            {isLocked ? "LOCKED" : "COMPLETE"}
          </button>
        )}
        <button
          className="btn-action abort"
          onClick={() => onAbort(contract.id)}>
          ABORT ×
        </button>
      </div>
    </div>
  );
};

export default ContractCard;
