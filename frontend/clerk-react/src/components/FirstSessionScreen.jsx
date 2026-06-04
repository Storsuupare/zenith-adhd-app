import React, { useState } from "react";
import "./FirstSessionScreen.css";

const DURATIONS = [
  { mins: 5,  label: "5m" },
  { mins: 15, label: "15m" },
  { mins: 30, label: "30m" },
  { mins: 60, label: "1h" },
];

export default function FirstSessionScreen({ onStart, onSkip, solarPhase, activeTheme }) {
  const [taskName, setTaskName] = useState("");
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim() || busy) return;
    setBusy(true);
    try {
      await onStart(taskName.trim(), duration);
    } finally {
      setBusy(false);
    }
  };

  // Applying phase + theme classes here makes --ui-accent and --accent-aXX vars
  // cascade to all children, so the accent colour matches the live solar phase.
  const rootClass = [
    "fss-root",
    solarPhase ? `phase-${solarPhase}` : "",
    activeTheme ? `theme-${activeTheme}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="fss-card">

        <div className="fss-brand">⬡ Zenith</div>

        <div>
          <h1 className="fss-headline">What are you working on?</h1>
          <p className="fss-sub">Name it. Pick a duration. Start.</p>
        </div>

        <form className="fss-form" onSubmit={handleSubmit}>
          <input
            className="fss-input"
            type="text"
            placeholder="e.g. Study for exam, Finish the report…"
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
            autoFocus
            maxLength={120}
            autoComplete="off"
          />

          <div>
            <p className="fss-dur-label">Duration</p>
            <div className="fss-durations" role="group" aria-label="Session duration">
              {DURATIONS.map(d => (
                <button
                  key={d.mins}
                  type="button"
                  className={`fss-dur-btn${duration === d.mins ? " active" : ""}`}
                  onClick={() => setDuration(d.mins)}
                  aria-pressed={duration === d.mins}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fss-divider" />

          <button
            type="submit"
            className="fss-start-btn"
            disabled={!taskName.trim() || busy}
          >
            {busy ? "Starting…" : "Start Session →"}
          </button>
        </form>

        <button className="fss-skip" type="button" onClick={onSkip}>
          Skip for now
        </button>

      </div>
    </div>
  );
}
