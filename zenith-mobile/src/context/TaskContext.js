import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { useUser } from "./UserContext";
import { fetchTasks, createTask, completeTask, failTask } from "../services/api";
import { beginSessionActivity, endSessionActivity } from "../services/liveActivity";

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user, fetchUser, refreshToken, userId, markAchievementsUnseen } = useUser();
  const [contracts,     setContracts]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loot,          setLoot]          = useState(null);
  const [levelUpData,   setLevelUpData]   = useState(null);
  const [prestigeData,  setPrestigeData]  = useState(null);
  const pendingMilestone = React.useRef(null);

  // Returns the freshly fetched list so callers can react to it immediately —
  // reading the `contracts` state right after this resolves would still see the
  // pre-fetch value, since setContracts() doesn't apply synchronously. Returns
  // null on failure so callers can tell "confirmed empty" apart from "unknown".
  const loadContracts = useCallback(async () => {
    if (!user?.external_id && !userId) return [];
    try {
      await refreshToken();
      const res = await fetchTasks(user?.external_id || userId);
      const freshContracts = res.data || [];
      setContracts(freshContracts);
      return freshContracts;
    } catch (err) {
      console.error("[TaskContext] loadContracts failed:", err.message);
      return null;
    }
  }, [refreshToken, user?.external_id, userId]);

  useEffect(() => {
    if (user) loadContracts();
    else setContracts([]);
  }, [user?.id]);

  const addNotification = useCallback((notif) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notif, id }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const handleCreateTask = useCallback(async ({ taskName, durationMinutes, skillName }) => {
    await refreshToken();
    const hadNoActiveSession = contracts.length === 0;
    const res = await createTask({ taskName, durationMinutes, skillName });
    await loadContracts();
    if (hadNoActiveSession) {
      beginSessionActivity({ title: taskName, skillName, durationMinutes });
    }
    return res.data;
  }, [refreshToken, loadContracts, contracts]);

  const handleComplete = useCallback(async (taskId) => {
    try {
      await refreshToken();
      const oldStreak = user?.streak ?? 0;
      const res = await completeTask(String(taskId));
      // Delay contract refresh so DoneOverlay has time to show the reward animation
      // before the modal closes due to the active contract disappearing.
      setTimeout(async () => {
        const [freshContracts] = await Promise.all([loadContracts(), fetchUser()]);
        if (freshContracts && freshContracts.length === 0) endSessionActivity();
      }, 4000);

      const { reward, leveledUp, newLevel, drop, skillLeveledUp, skillHit99, newSkillLevel, milestone, streak_bonus } = res.data;
      const newStreak = res.data.user?.streak ?? 0;

      // Trigger loot overlay if a drop was earned
      if (drop?.rarity) setLoot(drop);

      // Build milestone payload for the modal (used below to sequence it correctly)
      const milestonePayload = milestone ? {
        type:            "milestone",
        days:            milestone.days,
        credits_earned:  milestone.credits_earned,
        loot:            milestone.loot,
        shield_unlocked: milestone.shield_unlocked,
      } : null;

      // Trigger the right celebration based on what happened.
      // Milestone is always sequenced after any level-up to avoid two modals stacking.
      const hasLevelCelebration = skillHit99 || leveledUp || skillLeveledUp;

      if (skillHit99) {
        setLevelUpData({
          type:      "skill99",
          skillName: res.data.skill_name || null,
          level:     99,
          xpGain:    reward,
          tier:      user?.account_tier ?? 0,
        });
      } else if (leveledUp) {
        setLevelUpData({
          type:      "totalLevelUp",
          level:     newLevel,
          xpGain:    reward,
          skillName: res.data.skill_name || null,
          tier:      user?.account_tier ?? 0,
        });
      } else if (skillLeveledUp) {
        setLevelUpData({
          type:      "skillLevelUp",
          skillName: res.data.skill_name || null,
          level:     newSkillLevel,
          xpGain:    reward,
          tier:      user?.account_tier ?? 0,
        });
      } else if (reward) {
        addNotification({ type: "success", message: `+${reward} XP earned` });
      }

      if (milestonePayload) {
        if (hasLevelCelebration) {
          // Queue the milestone to fire after the level-up modal auto-dismisses.
          // The slowest auto-dismiss is skill99 at 5000ms; add 1s buffer.
          pendingMilestone.current = milestonePayload;
          setTimeout(() => {
            if (pendingMilestone.current) {
              setLevelUpData(pendingMilestone.current);
              pendingMilestone.current = null;
            }
          }, 6000);
        } else {
          setLevelUpData(milestonePayload);
        }
      }

      // Streak increment notification (only if no full milestone modal is showing)
      if (newStreak > oldStreak && !milestonePayload) {
        addNotification({ type: "success", message: `${newStreak}-day streak` + (streak_bonus ? `  +${streak_bonus} Credits` : "") });
      }

      if ((res.data.achievements_unlocked ?? []).length > 0) markAchievementsUnseen();

      return res.data;
    } catch (err) {
      addNotification({ type: "error", message: "Could not collect reward" });
    }
  }, [refreshToken, loadContracts, fetchUser, addNotification, markAchievementsUnseen, user?.streak, user?.account_tier]);

  const handleAbort = useCallback(async (taskId) => {
    try {
      await refreshToken();
      const oldStreak = user?.streak ?? 0;
      const res = await failTask(String(taskId));
      const [freshContracts] = await Promise.all([loadContracts(), fetchUser()]);
      if (freshContracts && freshContracts.length === 0) endSessionActivity();

      // Warn if the streak was wiped (not a grace-period drop)
      if (!res.data.grace_period && oldStreak > 0 && !res.data.streak_shield_used) {
        addNotification({ type: "error", message: `Streak lost — was ${oldStreak} days` });
      }
    } catch {
      addNotification({ type: "error", message: "Could not drop task" });
    }
  }, [refreshToken, loadContracts, fetchUser, addNotification, user?.streak]);

  const dismissLevelUp = useCallback(() => {
    // If the user manually taps to dismiss before the auto-dismiss fires, cancel
    // any pending milestone so it doesn't appear several seconds later unexpectedly.
    pendingMilestone.current = null;
    setLevelUpData(null);
  }, []);

  return (
    <TaskContext.Provider value={{
      contracts, loadContracts,
      notifications, addNotification,
      loot, setLoot,
      levelUpData, setLevelUpData, dismissLevelUp,
      prestigeData, setPrestigeData,
      handleCreateTask, handleComplete, handleAbort,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
