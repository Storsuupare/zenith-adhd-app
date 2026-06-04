import React, { useState, useMemo } from "react";
import { suggestZenithSkills } from "../utils/suggestZenithSkills";
import "./SuggestionPanel.css";

const SKILL_ICONS = {
  "LOGIC FLOW":  "⬡", "VITALITY":    "◈", "NUTRITION":   "◉",
  "ENVIRONMENT": "▣", "DEEP FOCUS":  "◎", "SYNTHESIS":   "⬢",
  "LOGISTICS":   "▤", "CREATIVE":    "◆", "DISCIPLINE":  "◫",
  "PRESENCE":    "◑", "RESTORATION": "◌", "RESOLVE":     "▲",
};

const SKILL_TRAINS = {
  "LOGIC FLOW":  ["Coding", "Debugging", "Math", "Chess", "Algorithm"],
  "VITALITY":    ["Gym", "Workout", "Running", "Cardio", "HIIT"],
  "NUTRITION":   ["Healthy Meal", "Meal Prep", "Hydration", "Vitamins"],
  "ENVIRONMENT": ["Cleaning", "Tidying", "Decluttering", "Organizing"],
  "DEEP FOCUS":  ["Deep Work", "Pomodoro", "Focus Session", "Task Sprint"],
  "SYNTHESIS":   ["Reading", "Study", "Research", "Note Taking"],
  "LOGISTICS":   ["Planning", "Email", "Scheduling", "To-do"],
  "CREATIVE":    ["Drawing", "Writing", "Music", "Design"],
  "DISCIPLINE":  ["Habit", "Routine", "Morning Routine", "Self-improvement"],
  "PRESENCE":    ["Call", "Friends", "Family", "Hangout"],
  "RESTORATION": ["Meditation", "Breathing", "Journaling", "Rest"],
  "RESOLVE":     ["Hard Task", "Cold Shower", "Challenge", "Commitment"],
};

const FEELINGS = [
  { emoji: "😵", label: "Wiped out",   level: 1 },
  { emoji: "😕", label: "Struggling",  level: 2 },
  { emoji: "😐", label: "Okay",        level: 3 },
  { emoji: "🙂", label: "Good",        level: 4 },
  { emoji: "⚡", label: "In the zone", level: 5 },
];

const PRIORITY_STYLE = {
  High:   { color: "#22d3ee", background: "rgba(34,211,238,0.08)",  borderColor: "rgba(34,211,238,0.25)" },
  Medium: { color: "#f59e0b", background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)" },
  Low:    { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" },
};

function firstSentence(text) {
  const idx = text.indexOf(".");
  return idx > -1 ? text.slice(0, idx + 1) : text;
}

const SuggestionPanel = ({ skills = [], streak = 0, onTaskSuggest }) => {
  const [feelingLevel, setFeelingLevel] = useState(3);
  const [showMore,     setShowMore]     = useState(false);

  const suggestions = useMemo(() => suggestZenithSkills({
    frictionPoints: [],
    bottlenecks:    [],
    focusLevel:     feelingLevel,
    skills,
    hour:   new Date().getHours(),
    streak,
  }), [feelingLevel, skills, streak]);

  const top    = suggestions[0];
  const others = suggestions.slice(1, 3);

  if (!top) return null;

  const topStyle   = PRIORITY_STYLE[top.priorityLevel];
  const topTrains  = SKILL_TRAINS[top.skillName] ?? [];

  return (
    <div className="sp-card">

      {/* ── Eyebrow ── */}
      <span className="sp-eyebrow">Your best move right now</span>

      {/* ── Primary suggestion ── */}
      <div className="sp-main">
        <div className="sp-main-header">
          <span className="sp-main-icon">{SKILL_ICONS[top.skillName]}</span>
          <span className="sp-main-name">{top.skillName}</span>
          <span className="sp-priority-pill" style={topStyle}>{top.priorityLevel}</span>
        </div>

        <p className="sp-reason">{firstSentence(top.why)}</p>

        <div className="sp-activities">
          {topTrains.map((activity) => (
            <button
              key={activity}
              className="sp-activity-chip"
              onClick={() => onTaskSuggest?.(activity)}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toggle ── */}
      <button className="sp-toggle" onClick={() => setShowMore(v => !v)}>
        {showMore ? "▴ fewer options" : "▾ not right? see more"}
      </button>

      {/* ── Expanded: alternatives + feeling adjuster ── */}
      {showMore && (
        <div className="sp-expanded">

          {/* Alt suggestions */}
          {others.map((s) => {
            const pStyle = PRIORITY_STYLE[s.priorityLevel];
            const trains = SKILL_TRAINS[s.skillName] ?? [];
            return (
              <div key={s.skillName} className="sp-alt-card">
                <div className="sp-alt-header">
                  <span className="sp-alt-icon">{SKILL_ICONS[s.skillName]}</span>
                  <span className="sp-alt-name">{s.skillName}</span>
                  <span className="sp-priority-pill" style={pStyle}>{s.priorityLevel}</span>
                </div>
                <div className="sp-activities">
                  {trains.slice(0, 4).map((activity) => (
                    <button
                      key={activity}
                      className="sp-activity-chip"
                      onClick={() => onTaskSuggest?.(activity)}
                    >
                      {activity}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Feeling adjuster */}
          <div className="sp-feeling-adjust">
            <span className="sp-feeling-question">How are you actually feeling?</span>
            <div className="sp-feeling-row">
              {FEELINGS.map((f) => (
                <button
                  key={f.level}
                  className={`sp-feeling-btn${feelingLevel === f.level ? " active" : ""}`}
                  onClick={() => setFeelingLevel(f.level)}
                >
                  <span className="sp-feeling-emoji">{f.emoji}</span>
                  <span className="sp-feeling-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default SuggestionPanel;
