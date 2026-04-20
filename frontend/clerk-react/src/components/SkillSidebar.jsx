import React, { useState, useEffect } from "react";
import { prime, setPhase, setProtocol } from "../../../src/audio/audioEngine";

const SKILL_DATA = {
  "LOGIC FLOW": {
    icon: "⬡",
    benefit: "Strengthens prefrontal pattern-recognition and deductive reasoning under pressure.",
    trains: ["Chess Protocol", "Project Roadmapping", "Puzzle Operations", "Algorithm Design", "Legal Analysis", "Code Review", "Strategic Planning"],
  },
  "VITALITY": {
    icon: "◈",
    benefit: "Elevates BDNF and cardiovascular output, directly upgrading neural processing speed.",
    trains: ["Gym", "Endurance Protocol", "Sprint Intervals", "Combat Training", "Strength Circuit", "Cold Exposure", "Mobility Sequence"],
  },
  "NUTRITION": {
    icon: "◉",
    benefit: "Stabilizes cortex glucose supply for sustained cognitive performance across long ops.",
    trains: ["Fuel Synthesis", "Macro Calibration", "Ration Prep", "Dietary Audit", "Supplement Protocol", "Fasting Protocol"],
  },
  "ENVIRONMENT": {
    icon: "▣",
    benefit: "Reduces ambient cognitive load, freeing working memory for high-priority execution.",
    trains: ["Cleaning", "Space Optimization", "Digital Purge", "Workspace Config", "Field Repair", "Supply Run"],
  },
  "DEEP FOCUS": {
    icon: "◎",
    benefit: "Deepens myelin sheathing on key pathways, compounding your capacity to enter flow state.",
    trains: ["Deep Work", "Flow State Session", "Isolation Sprint", "Single-Task Protocol", "Maker Block", "Zero-Interrupt Zone"],
  },
  "SYNTHESIS": {
    icon: "⬢",
    benefit: "Builds dense semantic memory networks and reinforces cross-domain connection architecture.",
    trains: ["Reading", "Philosophy Study", "Research & Intel", "Note Consolidation", "Language Acquisition", "Case Study Review"],
  },
  "LOGISTICS": {
    icon: "▤",
    benefit: "Closes open mental loops, suppressing cortisol and returning executive function to duty.",
    trains: ["Admin", "Inbox Zero", "Calendar Ops", "Task Triage", "Document Processing", "System Maintenance"],
  },
  "CREATIVE": {
    icon: "◆",
    benefit: "Activates the default mode network and strengthens divergent pathways for novel solutions.",
    trains: ["Writing", "Signal Design", "Audio Production", "Ideation Sprint", "Interface Design", "Music Composition"],
  },
  "WEALTH": {
    icon: "◫",
    benefit: "Develops long-horizon planning circuits and offloads financial threat signals from working memory.",
    trains: ["Financial Audit", "Investment Review", "Budget Calibration", "Revenue Protocol", "Tax Operations", "Asset Mapping"],
  },
  "PRESENCE": {
    icon: "◑",
    benefit: "Reinforces social neural circuitry and triggers oxytocin-mediated trust and rapport pathways.",
    trains: ["Social", "Network Deployment", "Mentorship Protocol", "Public Address", "Bond Maintenance", "Conflict Resolution"],
  },
  "RESTORATION": {
    icon: "◌",
    benefit: "Activates the parasympathetic system and accelerates synaptic pruning for memory consolidation.",
    trains: ["Meditation", "Breath Work", "Sleep Protocol", "Nature Immersion", "Journaling", "Neural Recovery"],
  },
  "RESOLVE": {
    icon: "▲",
    benefit: "Trains the anterior cingulate cortex for distress tolerance, expanding your willpower ceiling.",
    trains: ["Hard Task", "Morning Offensive", "Cold Protocol", "Discomfort Training", "High-Stakes Execution", "Fear Confrontation"],
  },
};

const SkillSidebar = ({
  skills,
  previewSkill,
  previewXP,
  handlePrestige,
  solarPhase,
  isProtocolActive,
  playHaptic,
}) => {
  const [expandedSkill, setExpandedSkill] = useState(null);

  useEffect(() => { prime(); }, []);
  useEffect(() => { setPhase(solarPhase); }, [solarPhase]);
  useEffect(() => { setProtocol(!!isProtocolActive); }, [isProtocolActive]);

  const toggleExpand = (name) => {
    playHaptic?.("TICK");
    setExpandedSkill((prev) => (prev === name ? null : name));
  };

  return (
    <aside className="operative-status-column">
      <div className="skill-grid-container">
        <div className="header-line" />
        <h2 className="selector-label">SKILLS</h2>
        <div className="header-line" />

        <div className="skill-grid">
          {Array.isArray(skills) &&
            skills.map((skill) => {
              const level = Number(skill.current_level) || 1;
              const xp = Number(skill.current_xp) || 0;
              const nextXP = Number(skill.next_level_xp) || 500;
              const name = (skill.skill_name ?? "UNKNOWN").toUpperCase();
              const isMax = level >= 99;
              const isPrev = previewSkill === name;
              const isExpanded = expandedSkill === name;
              const data = SKILL_DATA[name];

              const currentPct = Math.min((xp / nextXP) * 100, 100);
              const projectedPct = Math.min(((xp + previewXP) / nextXP) * 100, 100);

              return (
                <div
                  key={name}
                  className={`skill-card ${isPrev ? "active-preview" : ""} ${isMax ? "prestige-locked-in" : ""} ${isExpanded ? "skill-expanded" : ""}`}
                  onClick={() => toggleExpand(name)}>

                  <div className="skill-lvl-row">
                    <div className="skill-lvl">LVL {level}</div>
                    {skill.prestige > 0 && (
                      <div className="skill-rank">PRESTIGE {skill.prestige}</div>
                    )}
                    {data && (
                      <span className="skill-icon-badge">{data.icon}</span>
                    )}
                  </div>

                  <div className="skill-top-row">
                    <span className="skill-name">{name}</span>
                    {!isMax && (
                      <span className="xp-fraction">
                        {xp} <span className="dim">/ {nextXP}</span>{" "}
                        <span className="label">XP</span>
                      </span>
                    )}
                  </div>

                  {!isMax ? (
                    <>
                      <div className="skill-track">
                        <div className="track-bg" />
                        {isPrev && (
                          <div className="skill-fill ghost" style={{ width: `${projectedPct}%` }} />
                        )}
                        <div className="skill-fill" style={{ width: `${currentPct}%` }}>
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
                        onClick={(e) => { e.stopPropagation(); handlePrestige(name); }}>
                        <div className="btn-glitch-layer" />
                        <span className="btn-text">PRESTIGE SKILL</span>
                        <span className="btn-subtext">RESET TO LVL 1 · +10% BOOST</span>
                      </button>
                    </div>
                  )}

                  {isExpanded && data && (
                    <div className="skill-training-panel">
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

export default SkillSidebar;
