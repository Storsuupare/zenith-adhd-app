import React, { useState, useEffect } from "react";
import { getRecord } from "../../../src/DailyEngine.js";
import "./DailyChallenge.css";

// Each challenge has a `progress` function returning { current, target }.
// target > 1 → quantitative (show "X / Y" counter + proportional fill).
// target === 1 → binary (pulse until done, then full fill).
const CHALLENGES = [
  {
    id: "two_missions",
    text: "Complete 2 tasks today",
    metric:   (r) => r.length >= 2,
    progress: (r) => ({ current: Math.min(r.length, 2), target: 2 }),
  },
  {
    id: "long_session",
    text: "Run a 60+ min deep work session",
    metric:   (r) => r.some((e) => e.sessionMins >= 60),
    progress: (r) => ({ current: Math.min(Math.max(0, ...r.map(e => e.sessionMins ?? 0)), 60), target: 60 }),
  },
  {
    id: "early_focus",
    text: "Complete a task before noon",
    metric:   (r) => r.some((e) => new Date(e.ts).getHours() < 12),
    progress: (r) => ({ current: r.some((e) => new Date(e.ts).getHours() < 12) ? 1 : 0, target: 1 }),
  },
  {
    id: "vitality_boost",
    text: "Log a Vitality task",
    metric:   (r) => r.some((e) => e.skillName?.toLowerCase().includes("vitality")),
    progress: (r) => ({ current: r.some((e) => e.skillName?.toLowerCase().includes("vitality")) ? 1 : 0, target: 1 }),
  },
  {
    id: "skill_stack",
    text: "Complete tasks in 2 different skills",
    metric:   (r) => new Set(r.map((e) => e.skillName).filter(Boolean)).size >= 2,
    progress: (r) => ({ current: Math.min(new Set(r.map((e) => e.skillName).filter(Boolean)).size, 2), target: 2 }),
  },
  {
    id: "night_grind",
    text: "Complete a task during Red Zone hours",
    metric:   (r) => r.some((e) => { const h = new Date(e.ts).getHours(); return h >= 0 && h < 5; }),
    progress: (r) => ({ current: r.some((e) => { const h = new Date(e.ts).getHours(); return h >= 0 && h < 5; }) ? 1 : 0, target: 1 }),
  },
  {
    id: "streak_hold",
    text: "Complete at least 1 task today",
    metric:   (r) => r.length >= 1,
    progress: (r) => ({ current: Math.min(r.length, 1), target: 1 }),
  },
];

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
};

const DailyChallenge = ({ completionTick, userId }) => {
  const challenge = CHALLENGES[getDayOfYear() % CHALLENGES.length];
  const [isDone,         setIsDone]         = useState(false);
  const [justCompleted,  setJustCompleted]  = useState(false);
  const [progress,       setProgress]       = useState({ current: 0, target: 1 });

  useEffect(() => {
    const record = getRecord(userId);
    const prog   = challenge.progress(record);
    const done   = challenge.metric(record);
    setProgress(prog);
    if (done && !isDone) {
      setIsDone(true);
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 2200);
      return () => clearTimeout(t);
    }
  }, [completionTick]);

  const fillPct      = isDone ? 100 : Math.round((progress.current / progress.target) * 100);
  const isQuantitative = progress.target > 1;
  const showPulse    = !isDone && fillPct === 0;

  return (
    <div className={`daily-challenge${isDone ? " dc-complete" : ""}${justCompleted ? " dc-flash" : ""}`}>
      <div className="dc-header">
        <span className="dc-label">Daily Challenge</span>
        {isDone ? (
          <span className="dc-done-chip">Done ✓</span>
        ) : isQuantitative ? (
          <span className="dc-progress-count">{progress.current} / {progress.target}</span>
        ) : null}
      </div>
      <p className="dc-text">{challenge.text}</p>
      <div className="dc-bar">
        {showPulse ? (
          <div className="dc-bar-pulse" />
        ) : (
          <div
            className={`dc-bar-fill${isDone ? " done" : ""}`}
            style={{ width: `${fillPct}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
