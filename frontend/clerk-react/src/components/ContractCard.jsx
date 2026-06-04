import React, { useState, useEffect, useCallback } from "react";
import { SKILL_COLORS } from "../utils/constants";
import "../App.css";

const ContractCard = ({
  contract,
  onComplete,
  onAbort,
  onHover,
  onLeave,
  onTick,
  serverOffset = 0,
  streak = 0,
}) => {
  const duration     = Number(contract.duration_minutes || contract.durationMinutes || 30);
  const totalSeconds = duration * 60;
  const dl           = contract.deadline ? Date.parse(contract.deadline) : null;
  const now          = () => Date.now() + serverOffset;

  const getInitialTime = () => {
    if (dl && !isNaN(dl)) return Math.max(0, Math.ceil((dl - now()) / 1000));
    return totalSeconds;
  };

  const [timeLeft,    setTimeLeft]    = useState(getInitialTime);
  const [isPending,   setIsPending]   = useState(false);
  const [confirmDrop, setConfirmDrop] = useState(false);

  useEffect(() => {
    if (dl && !isNaN(dl)) {
      setTimeLeft(Math.max(0, Math.ceil((dl - now()) / 1000)));
    } else {
      setTimeLeft(totalSeconds);
    }
  }, [contract.id, totalSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const ticker = setTimeout(() => {
      const next = dl && !isNaN(dl)
        ? Math.max(0, Math.ceil((dl - now()) / 1000))
        : Math.max(0, timeLeft - 1);
      if (onTick) onTick(contract, next);
      setTimeLeft(next);
    }, 1000);
    return () => clearTimeout(ticker);
  }, [timeLeft]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isOptimistic = contract._optimistic === true;
  const isLocked     = timeLeft > 0;
  const isCritical   = timeLeft > 0 && timeLeft < 60;
  const progressPct  = Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));
  const skillColor   = SKILL_COLORS[(contract.skill_name || "").toUpperCase()] || "#22d3ee";

  const handleComplete = useCallback(async () => {
    if (isPending || isLocked || isOptimistic) return;
    setIsPending(true);
    try {
      await onComplete(String(contract.id));
    } finally {
      setIsPending(false);
    }
  }, [isPending, isLocked, onComplete, contract.id]);

  // ── Finish-line: timer reached zero, reward waiting ──────────
  if (!isLocked && !isOptimistic) {
    return (
      <div className="contract-card session-ready" style={{ "--skill-color": skillColor }}>
        <div className="ready-bg-glow" aria-hidden="true" />

        <div className="ready-inner">
          <div className="ready-header">
            <span className="ready-skill-tag">{contract.skill_name || "General"}</span>
            <span className="ready-done-badge">DONE</span>
            <span className="ready-duration">{duration} MIN</span>
          </div>

          <h4 className="ready-title">{contract.title}</h4>

          <div className="ready-reward-block">
            <span className="ready-xp">+{contract.stake_amount || contract.stakeAmount}</span>
            <span className="ready-xp-label">XP</span>
          </div>
        </div>

        <button
          className="session-collect-btn"
          onClick={handleComplete}
          disabled={isPending}
        >
          {isPending ? "···" : "Collect Reward →"}
        </button>
      </div>
    );
  }

  // ── Running state ─────────────────────────────────────────────
  return (
    <div
      className={[
        "contract-card",
        isOptimistic ? "optimistic-pending" : "",
      ].filter(Boolean).join(" ")}
      style={{ "--skill-color": skillColor }}
      onMouseEnter={() => !isLocked && !isOptimistic && onHover(contract.skillType, contract.stakeAmount)}
      onMouseLeave={onLeave}
    >
      <div className="card-main-content">
        <div className="mission-header">
          <span className="mission-id">[{contract.id}]</span>
          <span className="skill-tag">{contract.skill_name || "General"}</span>
        </div>

        <h4 className="mission-title">{contract.title}</h4>

        <div className="mission-data-grid">
          <div className={`data-node ${isCritical ? "critical-pulse" : ""}`}>
            <span className="label">Time left</span>
            <span className="value">{formatTime(timeLeft)}</span>
          </div>
          <div className="data-node reward">
            <span className="label">Reward</span>
            <span className="value">
              +{contract.stake_amount || contract.stakeAmount}
              <span className="xp-unit"> XP</span>
            </span>
          </div>
        </div>

        <div className="contract-progress-bar" aria-hidden="true">
          <div
            className={`contract-progress-fill${isCritical ? " critical" : ""}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="card-actions-vertical">
        {isOptimistic ? (
          <button className="btn-action primary" disabled>Starting…</button>
        ) : confirmDrop ? (
          <div className="drop-confirm">
            <span className="drop-warn">
              {streak > 0 ? `Resets your ${streak}-day streak` : "Adds a strike"}
            </span>
            <button
              className="btn-action abort"
              onClick={() => { setConfirmDrop(false); onAbort(contract.id); }}
            >
              Drop
            </button>
            <button
              className="btn-action"
              onClick={() => setConfirmDrop(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="lock-indicator">⏱</div>
            <button
              className="btn-action abort"
              onClick={() => setConfirmDrop(true)}
            >
              Drop ×
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(ContractCard);
