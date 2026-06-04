import React, { useState, useEffect, useRef, useCallback } from "react";
import { setPhase, setProtocol } from "../../../src/audio/audioEngine";
import { primeTimeEnvironment } from "../../../src/audio/AudioController";
import "./SkillSidebar.css";

const SKILL_DATA = {
  "LOGIC FLOW": {
    icon: "⬡",
    benefit: "Sharpens analytical thinking, pattern recognition, and problem-solving under pressure.",
    trains: ["Coding", "Debugging", "Math", "Chess", "Algorithm", "Code Review", "SQL", "Python", "Excel"],
  },
  "VITALITY": {
    icon: "◈",
    benefit: "Boosts energy, focus, and mood — your body is your most important productivity tool.",
    trains: ["Gym", "Workout", "Running", "Cardio", "HIIT", "Yoga", "Stretching", "Lifting", "Leg Day"],
  },
  "NUTRITION": {
    icon: "◉",
    benefit: "Fuels consistent energy levels and keeps your brain sharp throughout the day.",
    trains: ["Healthy Meal", "Meal Prep", "Cooking", "Hydration", "Vitamins", "Groceries", "Fasting"],
  },
  "ENVIRONMENT": {
    icon: "▣",
    benefit: "A cleaner space means a clearer head — less clutter around you, less clutter inside you.",
    trains: ["Cleaning", "Chores", "Dishes", "Laundry", "Organizing", "Decluttering", "Tidying"],
  },
  "EXECUTION": {
    icon: "◎",
    benefit: "The skill of actually doing the work — sitting down, starting, and seeing it through.",
    trains: ["Work Session", "Project", "Pomodoro", "Sprint", "Work Block", "Task Sprint", "Grind"],
  },
  "LEARNING": {
    icon: "⬢",
    benefit: "Builds knowledge that stacks over time — the more you learn, the faster you learn.",
    trains: ["Reading", "Study", "Research", "Note Taking", "Flashcards", "Course", "Book", "Language"],
  },
  "LOGISTICS": {
    icon: "▤",
    benefit: "Keeps your life organised and your head clear — fewer open loops, more focus.",
    trains: ["Organisation", "Email", "Planning", "Scheduling", "To-do", "Errands", "Paperwork", "Calendar"],
  },
  "CREATIVITY": {
    icon: "◆",
    benefit: "Trains your brain to think differently and express ideas in ways only you can.",
    trains: ["Drawing", "Writing", "Music", "Design", "Art", "Photography", "Blog", "Guitar", "Painting"],
  },
  "DISCIPLINE": {
    icon: "◫",
    benefit: "Builds the habit infrastructure that makes everything else easier — routines become automatic, not effortful.",
    trains: ["Habit", "Routine", "Morning Routine", "Practice", "Self-improvement", "Affirmation", "Ritual", "Daily"],
  },
  "PRESENCE": {
    icon: "◑",
    benefit: "Strengthens real connections — the people in your life are part of your progress too.",
    trains: ["Meeting", "Call", "Networking", "Friends", "Family", "Dating", "Hangout", "Chat"],
  },
  "RECOVERY": {
    icon: "◌",
    benefit: "Rest isn't laziness — it's how your brain resets and locks in everything you've worked on.",
    trains: ["Meditation", "Sleep", "Nap", "Breathing", "Journaling", "Rest", "Bath", "Sauna"],
  },
  "RESOLVE": {
    icon: "▲",
    benefit: "Doing the hard thing anyway — this skill grows every time you push through resistance.",
    trains: ["Hard Task", "Challenge", "Cold Shower", "Therapy", "Discipline", "Habit", "Mindset"],
  },
};

// ── Tier system ──────────────────────────────────────────────────────────────
function getTier(level) {
  if (level >= 50) return "vanguard";
  if (level >= 10) return "adept";
  return "novice";
}

const TIER_STYLE = {
  novice: {
    "--tier-color":    "rgba(255,255,255,0.28)",
    "--tier-glow":     "rgba(255,255,255,0.04)",
    "--tier-gradient": "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.5))",
  },
  adept: {
    "--tier-color":    "#00f5ff",
    "--tier-glow":     "rgba(0,245,255,0.22)",
    "--tier-gradient": "linear-gradient(90deg, #0096c7, #00f5ff, #ade8f4)",
  },
  vanguard: {
    "--tier-color":    "#ff0040",
    "--tier-glow":     "rgba(255,0,64,0.28)",
    "--tier-gradient": "linear-gradient(90deg, #c9184a, #ff0040, #ff758f)",
  },
};

// ────────────────────────────────────────────────────────────────────────────

const SkillSidebar = ({
  skills,
  previewSkill,
  previewXP,
  handlePrestige,
  solarPhase,
  isProtocolActive,
  playHaptic,
  levelUpSkill,
  activeSkillName,
}) => {
  const [expandedSkill, setExpandedSkill]   = useState(null);
  const [flashSkill,    setFlashSkill]       = useState(null);
  const [shimmerActive, setShimmerActive]    = useState(false);
  const prevLevelUpRef                        = useRef(null);

  useEffect(() => { primeTimeEnvironment(); }, []);
  useEffect(() => { setPhase(solarPhase); },   [solarPhase]);
  useEffect(() => { setProtocol(!!isProtocolActive); }, [isProtocolActive]);

  // Trigger flash + shimmer swipe whenever a new skill levels up
  useEffect(() => {
    if (!levelUpSkill || levelUpSkill === prevLevelUpRef.current) return;
    prevLevelUpRef.current = levelUpSkill;
    const name = levelUpSkill.toUpperCase();
    setFlashSkill(name);
    setShimmerActive(true);
    const t1 = setTimeout(() => setFlashSkill(null),    820);
    const t2 = setTimeout(() => setShimmerActive(false), 1150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [levelUpSkill]);

  const toggleExpand = useCallback((name) => {
    playHaptic?.("TICK");
    setExpandedSkill((prev) => (prev === name ? null : name));
  }, [playHaptic]);

  return (
    <aside className="operative-status-column">
      {/* Shimmer swipe overlay — GPU composited via translate3d */}
      {shimmerActive && (
        <div className="sidebar-shimmer-swipe" aria-hidden="true" />
      )}

      <div className="skill-grid-container">
        <div className="header-line" />
        <div className="header-line" />

        <div className="skill-grid">
          {Array.isArray(skills) &&
            skills.map((skill) => {
              const level    = Number(skill.current_level) || 1;
              const xp       = Number(skill.current_xp)   || 0;
              const nextXP   = Number(skill.next_level_xp) || 500;
              const name     = (skill.skill_name ?? "UNKNOWN").toUpperCase();
              const tier     = getTier(level);
              const tierCss  = TIER_STYLE[tier];
              const isMax    = level >= 99;
              const isPrev   = previewSkill === name;
              const isExpanded = expandedSkill === name;
              const isActive = activeSkillName?.toUpperCase() === name;
              const isFlashing = flashSkill === name;
              const data     = SKILL_DATA[name];
              const boostActive = skill.prestige_boost_until && new Date(skill.prestige_boost_until) > new Date();

              const currentPct   = Math.min((xp / nextXP) * 100, 100);
              const projectedPct = Math.min(((xp + previewXP) / nextXP) * 100, 100);

              const classes = [
                "skill-card",
                `tier-${tier}`,
                isPrev      ? "active-preview"     : "",
                isMax       ? "prestige-locked-in" : "",
                isExpanded  ? "skill-expanded"     : "",
                isActive    ? "skill-aura-active"  : "",
                isFlashing  ? "skill-level-flash"  : "",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={name}
                  className={classes}
                  style={tierCss}
                  onClick={() => toggleExpand(name)}
                >
                  {/* Level row */}
                  <div className="skill-lvl-row">
                    <div className="skill-lvl">LVL {level}</div>
                    {level >= 2 && !isMax && (
                      <div className="skill-xp-bonus" title={`Level ${level} grants +${level * 5}% skill XP per session`}>
                        +{level * 5}% XP
                      </div>
                    )}
                    {(skill.prestige_level > 0) && (
                      <div className="skill-prestige-stars" title={`Prestige ${skill.prestige_level}`}>
                        {"★".repeat(Math.min(skill.prestige_level, 5))}
                      </div>
                    )}
                    {data && (
                      <span className="skill-icon-badge">{data.icon}</span>
                    )}
                  </div>

                  {/* Name + XP fraction */}
                  <div className="skill-top-row">
                    <span className="skill-name">
                      {name}
                      {boostActive && (
                        <span className="skill-prestige-boost" title="Prestige boost active — 2× XP for 24h"> 2×</span>
                      )}
                    </span>
                    {!isMax && (
                      <span className="xp-fraction">
                        {xp} <span className="dim">/ {nextXP}</span>{" "}
                        <span className="label">XP</span>
                      </span>
                    )}
                  </div>

                  {!isMax ? (
                    <>
                      {/* Progress bar — gradient + glow tied to tier */}
                      <div className="skill-track">
                        <div className="track-bg" />
                        {isPrev && (
                          <div
                            className="skill-fill ghost"
                            style={{ width: `${projectedPct}%`, transform: "translate3d(0,0,0)" }}
                          />
                        )}
                        <div
                          className="skill-fill"
                          style={{
                            width:      `${currentPct}%`,
                            background: `var(--tier-gradient)`,
                            boxShadow:  `0 0 7px var(--tier-glow)`,
                            transform:  "translate3d(0,0,0)",
                          }}
                        >
                          <div className="glint" />
                        </div>
                      </div>
                      <div className="skill-percent-readout">
                        {Math.floor(currentPct)}% TO NEXT LEVEL
                      </div>
                    </>
                  ) : (
                    <div className="prestige-mandatory-container">
                      <button
                        className="prestige-trigger-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrestige(name);
                        }}
                      >
                        <div className="btn-glitch-layer" />
                        <span className="btn-text">PRESTIGE SKILL</span>
                        <span className="btn-subtext">RESET TO LVL 1 · +10% XP · 3,500 CR</span>
                      </button>
                    </div>
                  )}

                  {/* Expanded panel */}
                  {isExpanded && data && (
                    <div className="skill-training-panel">
                      <div className="benefit-synced-label">◈ SYNCED</div>
                      <p className="training-benefit">{data.benefit}</p>
                      <div className="training-missions-label">Trains Via</div>
                      <ul className="training-missions-list">
                        {data.trains.map((m) => (
                          <li key={m} className="training-mission-item">
                            <span className="training-dot">▸</span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="skill-info-trigger">
                    {isExpanded ? "▴ collapse" : "▾ what trains this?"}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(SkillSidebar);
