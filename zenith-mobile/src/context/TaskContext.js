import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { useUser } from "./UserContext";
import { fetchTasks, createTask, completeTask, failTask } from "../services/api";

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user, fetchUser, refreshToken, userId } = useUser();
  const [contracts,     setContracts]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loot,          setLoot]          = useState(null);
  const [levelUpData,   setLevelUpData]   = useState(null);
  const [prestigeData,  setPrestigeData]  = useState(null);

  const loadContracts = useCallback(async () => {
    if (!user?.external_id && !userId) return;
    try {
      await refreshToken();
      const res = await fetchTasks(user?.external_id || userId);
      setContracts(res.data || []);
    } catch (err) {
      console.error("[TaskContext] loadContracts failed:", err.message);
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
    const res = await createTask({ taskName, durationMinutes, skillName });
    await loadContracts();
    return res.data;
  }, [refreshToken, loadContracts]);

  const handleComplete = useCallback(async (taskId) => {
    try {
      await refreshToken();
      const oldStreak = user?.streak ?? 0;
      const res = await completeTask(String(taskId));
      await Promise.all([loadContracts(), fetchUser()]);

      const { reward, leveledUp, newLevel, drop } = res.data;
      const newStreak = res.data.user?.streak ?? 0;

      // Trigger loot overlay if a drop was earned
      if (drop?.rarity) setLoot(drop);

      // Trigger level-up overlay
      if (leveledUp) {
        setLevelUpData({
          level:     newLevel,
          xpGain:    reward,
          skillName: res.data.skill_name || null,
          tier:      user?.account_tier ?? 0,
        });
      } else if (reward) {
        addNotification({ type: "success", message: `+${reward} XP earned` });
      }

      // Streak milestone notification
      if (newStreak > oldStreak) {
        addNotification({ type: "success", message: `🔥 ${newStreak}-day streak!` });
      }

      return res.data;
    } catch (err) {
      addNotification({ type: "error", message: "Could not collect reward" });
    }
  }, [refreshToken, loadContracts, fetchUser, addNotification, user?.streak, user?.account_tier]);

  const handleAbort = useCallback(async (taskId) => {
    try {
      await refreshToken();
      const oldStreak = user?.streak ?? 0;
      const res = await failTask(String(taskId));
      await Promise.all([loadContracts(), fetchUser()]);

      // Warn if the streak was wiped (not a grace-period drop)
      if (!res.data.grace_period && oldStreak > 0 && !res.data.streak_shield_used) {
        addNotification({ type: "error", message: `Streak lost — was ${oldStreak} days` });
      }
    } catch {
      addNotification({ type: "error", message: "Could not drop task" });
    }
  }, [refreshToken, loadContracts, fetchUser, addNotification, user?.streak]);

  return (
    <TaskContext.Provider value={{
      contracts, loadContracts,
      notifications, addNotification,
      loot, setLoot,
      levelUpData, setLevelUpData,
      prestigeData, setPrestigeData,
      handleCreateTask, handleComplete, handleAbort,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
