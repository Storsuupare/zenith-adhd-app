import React from "react";
import { useUserContext, useTaskContext, useUIContext } from "../../../src/AppContext";
import { SKILL_COLORS } from "../utils/constants";
import StatHUD from "./StatHUD";

function getContextHint(user) {
  const hour   = new Date().getHours();
  const streak = user?.streak ?? 0;

  if (hour >= 8  && hour < 11) return { icon: "◎", text: "Peak window — best XP until 11am." };
  if (hour >= 22)               return { icon: "◑", text: "Hyperfocus window. Best XP for the day." };
  if (hour >= 0  && hour < 5)  return { icon: "⚠", text: "Red Zone active — rewards halved." };
  if (streak >= 7)              return { icon: "▲", text: `${streak}-day streak. Don't break it.` };
  if (streak >= 3)              return { icon: "▲", text: `${streak}-day streak. Keep it going.` };

  const skills  = user?.mastery ?? [];
  const weakest = skills.length > 0
    ? skills.reduce((min, s) => Number(s.current_level) < Number(min.current_level) ? s : min, skills[0])
    : null;
  if (weakest) return { icon: "◎", text: `${weakest.skill_name} is your weakest. 30 min?` };

  return { icon: "◎", text: "All clear. What are we working on?" };
}
import SkillSidebar from "./SkillSidebar";
import MissionForm from "./MissionForm";
import ContractCard from "./ContractCard";
import DailyChallenge from "./DailyChallenge";
import "./DashboardView.css";

const DashboardView = () => {
  const { user, clerkUser, inventory, handlePrestige, handleDailyBonus, getRank, isRedzone } = useUserContext();
  const {
    contracts,
    previewXP, previewSkill, setPreviewSkill, setPreviewXP,
    selectedModule, setSelectedModule,
    modules,
    getMissionStakes, SUBJECT_TO_SKILL_MAP,
    handleInitiate, handleDrop, handleComplete, handleAbort, handleContractCreated,
    xpGain, xpBurstKey, completionTick, levelUpSkill, activeSkillName,
  } = useTaskContext();
  const { solarPhase, playHaptic } = useUIContext();

  const lvl         = user?.level ?? 1;
  const nextLvlXP   = Math.max(1, Math.floor(100 * Math.pow(lvl, 1.8)));
  const withinLvlXP = Math.min(user?.xp ?? 0, nextLvlXP);
  const accountTier  = user?.account_tier ?? 0;

  const bonusClaimed = React.useMemo(() => {
    if (!user?.daily_bonus_claimed_at) return false;
    const elapsedMs = Date.now() - new Date(user.daily_bonus_claimed_at).getTime();
    return elapsedMs < 24 * 60 * 60 * 1000;
  }, [user?.daily_bonus_claimed_at]);

  const handlePreviewLeave = React.useCallback(() => setPreviewSkill(null), [setPreviewSkill]);

  return (
    <div className="dashboard-layout">
      {/* ── Left column: mission control ── */}
      <div className="mission-control-column">

        {/* 1. StatHUD — current status */}
        <div className="stat-hud-container">
          <StatHUD
            currentLevel={lvl}
            totalXP={user?.total_xp ?? 0}
            currentLevelXP={withinLvlXP}
            nextLevelXP={nextLvlXP}
            progressPercent={Math.min((withinLvlXP / nextLvlXP) * 100, 100)}
            previewXP={previewXP}
            streak={user?.streak ?? 0}
            xpRemaining={nextLvlXP - withinLvlXP}
            getRank={getRank}
            credits={user?.system_credits ?? 0}
            sysVersion={user?.system_version ?? 1}
            accountTier={accountTier}
            xpGain={xpGain}
            xpBurstKey={xpBurstKey}
            isRedzone={isRedzone}
            onDailyBonus={handleDailyBonus}
            bonusClaimed={bonusClaimed}
          />
        </div>

        {/* 2. Daily Challenges — immediate goals */}
        <div className="daily-challenge-container">
          <DailyChallenge completionTick={completionTick} userId={clerkUser?.id} />
        </div>

        {/* 3. MissionForm or session indicator */}
        <div className="mission-form-container">
          {contracts.length > 0 ? (
            <div
              className="session-running-indicator"
              style={{ "--skill-color": SKILL_COLORS[(contracts[0]?.skill_name || "").toUpperCase()] || "#22d3ee" }}
            >
              <div className="sri-dot" />
              <div className="sri-info">
                <span className="sri-skill">{contracts[0]?.skill_name || "General"}</span>
                <span className="sri-title">{contracts[0]?.title}</span>
              </div>
              {contracts.length > 1 && (
                <span className="sri-count">+{contracts.length - 1} more</span>
              )}
            </div>
          ) : (
            <MissionForm
              selectedModule={selectedModule}
              setSelectedModule={setSelectedModule}
              modules={modules}
              currentLevel={lvl}
              userTier={user?.account_tier ?? 0}
              getMissionStakes={getMissionStakes}
              setPreviewXP={setPreviewXP}
              setPreviewSkill={setPreviewSkill}
              SUBJECT_TO_SKILL_MAP={SUBJECT_TO_SKILL_MAP}
              handleInitiate={handleInitiate}
              handleDrop={handleDrop}
              playHaptic={playHaptic}
              onContractCreated={handleContractCreated}
              clerkUser={clerkUser}
              shouldFocusInput={contracts.length === 0}
            />
          )}
        </div>

        {/* 5. Active Tasks */}
        <div className="logs-section">
          <h3 className="section-title">Active Tasks</h3>
          {contracts?.length > 0 ? (
            contracts.map(c => (
              <ContractCard
                key={c.id}
                contract={c}
                onComplete={handleComplete}
                onAbort={handleAbort}
                onHover={setPreviewSkill}
                onLeave={handlePreviewLeave}
                serverOffset={0}
                streak={user?.streak ?? 0}
              />
            ))
          ) : (
            (() => {
              const hint = getContextHint(user);
              return (
                <div className="empty-state">
                  <span className="empty-state-icon">{hint.icon}</span>
                  <span className="empty-state-text">{hint.text}</span>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* 6. Skill sidebar — right column on desktop, compact grid below on mobile */}
      <div className="skill-sidebar-container">
        <SkillSidebar
          skills={user?.mastery ?? []}
          previewSkill={previewSkill}
          previewXP={previewXP}
          handlePrestige={handlePrestige}
          solarPhase={solarPhase}
          isProtocolActive={false}
          playHaptic={playHaptic}
          levelUpSkill={levelUpSkill}
          activeSkillName={activeSkillName}
        />
      </div>
    </div>
  );
};

export default DashboardView;
