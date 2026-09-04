const express = require("express");
const pool = require("../lib/db.js");
const { requireAuth } = require("../lib/auth.js");
const { mutationLimiter } = require("../lib/rateLimiters.js");
const { pushUserPatch, presenceMap, broadcastPresence } = require("../lib/realtime.js");
const {
  calculateStake, getNeuralMult, applyPrestigeImmunity, TIER_MAX_TASKS, LOOT_DROP_CHANCE, STREAK_MILESTONES,
  SKILL_LEVEL_MILESTONES, crossedSkillLevelMilestones, SESSION_CR_BY_DURATION, computeCreditableMinutes,
} = require("../lib/economy.js");
const { VALID_DURATIONS } = require("../lib/validation.js");
const { CREDIT_BY_RARITY, rollRarity } = require("../LootData.js");
const { evaluateAchievements } = require("../achievementService.js");
const { track: trackEvent, captureException, identify: identifyUser } = require("../analytics.js");

const router = express.Router();

router.post("/api/tasks", requireAuth, mutationLimiter, async (req, res) => {
  const { taskName, durationMinutes, stakeAmount, skillName } = req.body;
  const externalId = req.auth.userId;

  if (!taskName || typeof taskName !== "string" || taskName.trim().length === 0 || taskName.length > 200)
    return res.status(400).json({ error: "Task name must be 1–200 characters" });

  const parsedDuration = parseInt(durationMinutes);
  if (!VALID_DURATIONS.has(parsedDuration)) {
    return res.status(400).json({ error: "Duration must be 5, 15, 30, 60, 90, or 120 minutes" });
  }

  const taskClient = await pool.connect();
  try {
    await taskClient.query("BEGIN");

    const taskUserRes = await taskClient.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (taskUserRes.rows.length === 0) {
      await taskClient.query("ROLLBACK");
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }
    const internalUserId = taskUserRes.rows[0].id;

    const taskTierRow = await taskClient.query(
      "SELECT COALESCE(account_tier,0) AS account_tier, COALESCE(role,'FREE') AS role FROM users WHERE id = $1",
      [internalUserId],
    );
    const { account_tier: cTier, role: cRole } = taskTierRow.rows[0];

    const taskMaxLimit = cRole === "ADMIN" ? Infinity : (TIER_MAX_TASKS[cTier] ?? 5);
    if (taskMaxLimit !== Infinity) {
      const taskActiveCount = await taskClient.query(
        "SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'ACTIVE'",
        [internalUserId],
      );
      if (parseInt(taskActiveCount.rows[0].count) >= taskMaxLimit) {
        await taskClient.query("ROLLBACK");
        // The only moment a user actually meets the paywall. Without this we can't
        // tell whether the limit converts, annoys, or is never reached at all.
        trackEvent(externalId, "paywall_hit", { limit: taskMaxLimit, tier: cTier, reason: "task_slots" });
        return res.status(403).json({
          error: "TASK LIMIT REACHED",
          message: `You've reached your ${taskMaxLimit}-task limit. Upgrade your plan to run more missions at once!`,
        });
      }
    }

    let targetSkillId = null;
    let resolvedSkillName = null;
    
    // Skill lookup with fallback to "Resolve" if not found
    if (skillName) {
      const targetSkillRes = await taskClient.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        [skillName],
      );
      if (targetSkillRes.rows[0]?.id) {
        targetSkillId = targetSkillRes.rows[0].id;
        resolvedSkillName = targetSkillRes.rows[0].name;
      } else {
        // Fallback to "Resolve" skill if not found - prevents UNKNOWN bug
        const fallbackRes = await taskClient.query(
          "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
          ["Resolve"],
        );
        if (fallbackRes.rows[0]) {
          targetSkillId = fallbackRes.rows[0].id;
          resolvedSkillName = fallbackRes.rows[0].name;
        }
      }
    } else {
      // Default to "Resolve" skill when no skillName provided
      const defaultRes = await taskClient.query(
        "SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1)",
        ["Resolve"],
      );
      if (defaultRes.rows[0]) {
        targetSkillId = defaultRes.rows[0].id;
        resolvedSkillName = defaultRes.rows[0].name;
      }
    }

    // Stake is calculated server-side from duration + server time (Red Zone check).
    // The client value is ignored — this prevents clock-spoofing to bypass Red Zone.
    const serverStake = calculateStake(parsedDuration);

    const newTask = await taskClient.query(
      `INSERT INTO tasks (user_id, title, duration_minutes, stake_amount, status, deadline, skill_id)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW() + ($5 || ' minutes')::interval, $6)
        RETURNING *, NOW() AS server_now`,
      [
        internalUserId,
        taskName,
        durationMinutes,
        serverStake,
        String(parseFloat(durationMinutes)),
        targetSkillId,
      ],
    );

    await taskClient.query("COMMIT");
    pushUserPatch(externalId).catch(() => {});

    // Skill and duration distribution across many of these is what answers
    // whether 12 skills is too many and whether long sessions get used at all.
    // The task's title is deliberately not included — it's the user's own words.
    trackEvent(externalId, "session_started", {
      duration_minutes: parsedDuration,
      skill:            resolvedSkillName,
      tier:             cTier ?? 0,
      hour_of_day:      new Date().getHours(),
    });

    presenceMap.set(externalId, {
      sessionId: Math.random().toString(36).slice(2, 10),
      skillName: resolvedSkillName || "Focus",
      duration:  parsedDuration,
      startedAt: new Date().toISOString(),
      tier:      cTier ?? 0,
    });
    broadcastPresence();

    res.status(201).json({
      ...newTask.rows[0],
      skill_name: resolvedSkillName,
    });
  } catch (err) {
    await taskClient.query("ROLLBACK");
    console.error("TASK_ERROR:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    taskClient.release();
  }
});

router.get("/api/tasks", requireAuth, async (req, res) => {
  const externalId = req.auth.userId;
  try {
    const tasksUserRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (tasksUserRes.rows.length === 0) return res.json([]);

    const tasksListRes = await pool.query(
      `SELECT tasks.*,
              skills.name                              AS skill_name,
              COALESCE(user_skills.prestige_level, 0)   AS prestige_level,
              NOW()                                     AS server_now
       FROM tasks
       LEFT JOIN skills      ON skills.id = tasks.skill_id
       LEFT JOIN user_skills ON user_skills.skill_id = tasks.skill_id
                             AND user_skills.user_id  = tasks.user_id::integer
       WHERE tasks.user_id = $1 AND tasks.status = 'ACTIVE'`,
      [tasksUserRes.rows[0].id],
    );
    res.json(tasksListRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/tasks/active/:externalId", requireAuth, async (req, res) => {
  try {
    const externalId = req.auth.userId;

    const activeUserRes = await pool.query(
      "SELECT id FROM users WHERE external_id = $1",
      [externalId],
    );
    if (activeUserRes.rows.length === 0)
      return res.status(404).json({ message: "NO ACTIVE MISSION!" });

    const activeTasksRes = await pool.query(
      "SELECT *, NOW() AS server_now FROM tasks WHERE user_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [activeUserRes.rows[0].id],
    );

    if (activeTasksRes.rows.length > 0) {
      res.json(activeTasksRes.rows[0]);
    } else {
      res.status(404).json({ message: "NO ACTIVE MISSION!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("SERVER ERROR!!!");
  }
});

router.post("/api/tasks/:id/complete", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;

  const completeClient = await pool.connect();
  try {
    await completeClient.query("BEGIN");

    const taskRes = await completeClient.query(
      `SELECT tasks.id,
              tasks.title            AS "taskName",
              tasks.duration_minutes AS "durationMinutes",
              tasks.stake_amount     AS "stakeAmount",
              tasks.user_id          AS "userId",
              tasks.status,
              tasks.skill_id         AS "skillId",
              tasks.created_at       AS "createdAt",
              tasks.deadline,
              (NOW() >= tasks.deadline)       AS "deadlinePassed",
              EXTRACT(EPOCH FROM (tasks.deadline - NOW()))::int AS "secondsRemaining"
       FROM tasks
       JOIN users ON tasks.user_id::text = users.id::text
       WHERE tasks.id::text = $1 AND users.external_id::text = $2`,
      [String(id), String(externalId)],
    );

    const task = taskRes.rows[0];
    if (!task) {
      await completeClient.query("ROLLBACK");
      return res.status(404).json({ error: "TASK_NOT_FOUND" });
    }
    if (task.status === "SUCCESS") {
      await completeClient.query("ROLLBACK");
      return res.status(400).json({ error: "TASK_ALREADY_COMPLETED" });
    }
    if (!task.deadlinePassed) {
      await completeClient.query("ROLLBACK");
      return res.status(425).json({
        error: "TASK_NOT_YET_COMPLETE",
        seconds_remaining: Math.max(0, task.secondsRemaining),
      });
    }

    const userRow = await completeClient.query(
      `SELECT xp, level, total_xp,
              COALESCE(system_credits, 0) AS credits,
              COALESCE(account_tier, 0)   AS account_tier,
              COALESCE(role, 'FREE')      AS role,
              COALESCE(streak, 0)         AS streak,
              COALESCE(first_task_completed, false) AS first_task_completed
       FROM users WHERE id::text = $1`,
      [String(task.userId)],
    );
    const { xp, level, total_xp, credits, account_tier, role, streak, first_task_completed } = userRow.rows[0];

    const durationMins = Math.min(parseInt(task.durationMinutes) || 0, 180);
    const xpRequiredForLevel = (lvl) => Math.max(1, Math.floor(100 * Math.pow(lvl, 1.6)));

    const streakCount  = parseInt(streak || 0);

    // A user can have several tasks active at once (task slots), but can only
    // actually focus on one at a time — without this, stacking short tasks
    // into the same real window pays out N× the reward for that time. Only
    // the portion of this task's window not already claimed by one of the
    // user's other completed tasks earns anything.
    const overlappingRes = await completeClient.query(
      `SELECT created_at AS "start", deadline AS "end"
       FROM tasks
       WHERE user_id::text = $1 AND status = 'SUCCESS' AND id::text != $2
         AND created_at < $3 AND deadline > $4`,
      [String(task.userId), String(id), task.deadline, task.createdAt],
    );
    const creditableMinutes = computeCreditableMinutes(
      new Date(task.createdAt),
      new Date(task.deadline),
      overlappingRes.rows.map(row => ({ start: new Date(row.start), end: new Date(row.end) })),
    );
    const overlapMinutes = durationMins - creditableMinutes;
    const creditRatio    = durationMins > 0 ? creditableMinutes / durationMins : 0;

    const stakeXp       = Math.floor(Math.floor(parseInt(task.stakeAmount || 0) * 1.5) * creditRatio);
    let totalXpGained   = stakeXp;
    const sessionCr     = Math.floor((SESSION_CR_BY_DURATION[durationMins] ?? 0) * creditRatio);

    let completedSkillName         = null;
    let skillLeveledUp             = false;
    let skillHit99                 = false;
    let returnedSkillLevel         = null;
    let skillMilestoneCreditsEarned = 0;
    if (task.skillId) {
      const skillRow = await completeClient.query(
        `SELECT user_skills.id, user_skills.xp, user_skills.level, user_skills.next_level_xp, user_skills.prestige_level,
                user_skills.prestige_boost_until, skills.name AS skill_name
         FROM user_skills
         JOIN skills ON user_skills.skill_id = skills.id
         WHERE user_skills.user_id = $1 AND user_skills.skill_id = $2`,
        [task.userId, task.skillId],
      );
      if (skillRow.rows.length > 0) {
        const skillData = skillRow.rows[0];
        completedSkillName = skillData.skill_name;
        const skillLevel       = parseInt(skillData.level);
        const levelMult  = 1 + (skillLevel * 0.05);
        const baseSkillXp  = Math.floor(creditableMinutes * 50 * levelMult);
        const prestigeMult = 1 + (parseInt(skillData.prestige_level || 0) * 0.10);
        // 24h post-prestige boost: doubles skill XP for the first day of the new grind
        const boostActive  = skillData.prestige_boost_until && new Date(skillData.prestige_boost_until) > new Date();
        const boostMult    = boostActive ? 2.0 : 1.0;
        const neuralMult   = getNeuralMult();
        const effectiveNeuralMult = applyPrestigeImmunity(neuralMult, parseInt(skillData.prestige_level || 0));
        const finalSkillXp = Math.round(baseSkillXp * prestigeMult * boostMult * effectiveNeuralMult);
        totalXpGained += finalSkillXp;
        let skillXp    = parseInt(skillData.xp) + finalSkillXp;
        let newSkillLevel = skillLevel;
        let nextSkillLevelXpRequired   = xpRequiredForLevel(newSkillLevel);
        while (skillXp >= nextSkillLevelXpRequired && newSkillLevel < 99) { skillXp -= nextSkillLevelXpRequired; newSkillLevel++; nextSkillLevelXpRequired = xpRequiredForLevel(newSkillLevel); }
        skillLeveledUp = newSkillLevel > skillLevel;
        skillHit99     = newSkillLevel === 99 && skillLevel < 99;
        returnedSkillLevel = newSkillLevel;
        await completeClient.query(
          `UPDATE user_skills SET xp = $1, level = $2, next_level_xp = $3 WHERE id = $4`,
          [skillXp, newSkillLevel, nextSkillLevelXpRequired, skillData.id],
        );

        // Per-skill level milestones (10/20/.../90) — a big XP gain can cross
        // more than one in a single session, so each crossed threshold is
        // claimed independently. Same SAVEPOINT isolation as the streak
        // milestone block below: a failure here must never cost the session
        // its already-earned XP, credits, or loot.
        const crossedLevels = crossedSkillLevelMilestones(skillLevel, newSkillLevel);
        if (crossedLevels.length > 0) {
          await completeClient.query("SAVEPOINT skill_milestone_processing");
          try {
            for (const crossedLevel of crossedLevels) {
              const skillMilestoneInsert = await completeClient.query(
                `INSERT INTO skill_level_milestones (user_id, skill_id, level)
                 VALUES ($1::integer, $2, $3) ON CONFLICT DO NOTHING`,
                [parseInt(task.userId, 10), skillData.id, crossedLevel],
              );
              if (skillMilestoneInsert.rowCount === 1) {
                const reward = SKILL_LEVEL_MILESTONES[crossedLevel];
                await completeClient.query(
                  `UPDATE users SET system_credits = system_credits + $1 WHERE id::text = $2`,
                  [reward, String(task.userId)],
                );
                skillMilestoneCreditsEarned += reward;
              }
            }
            await completeClient.query("RELEASE SAVEPOINT skill_milestone_processing");
          } catch (skillMilestoneError) {
            console.error("[SKILL_MILESTONE] Processing failed:", skillMilestoneError.message);
            await completeClient.query("ROLLBACK TO SAVEPOINT skill_milestone_processing");
            await completeClient.query("RELEASE SAVEPOINT skill_milestone_processing");
          }
        }
      }
    }

    let globalXp      = parseInt(xp) + totalXpGained;
    let globalLevel     = parseInt(level);
    let globalTotalXp = (parseInt(total_xp) || 0) + totalXpGained;
    let nextGlobalLevelXpRequired    = xpRequiredForLevel(globalLevel);
    let leveledUp = false;
    while (globalXp >= nextGlobalLevelXpRequired) { globalXp -= nextGlobalLevelXpRequired; globalLevel++; nextGlobalLevelXpRequired = xpRequiredForLevel(globalLevel); leveledUp = true; }

    // last_reboot = NOW() starts the regen clock fresh from the moment the task ends.
    const updatedUser = await completeClient.query(
      `UPDATE users
       SET xp = $1, level = $2, current_level = $2, total_xp = $3,
           system_credits = system_credits + $5,
           streak = CASE
             WHEN streak_last_updated IS NULL
               OR DATE(streak_last_updated AT TIME ZONE COALESCE(timezone, 'UTC'))
                < DATE(NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))
             THEN streak + 1
             ELSE streak
           END,
           strikes = 0,
           streak_in_grace = false,
           streak_last_updated = NOW(),
           last_reboot = NOW(),
           reengagement_push_sent = false
       WHERE id::text = $4 RETURNING *`,
      [globalXp, globalLevel, globalTotalXp, String(task.userId), sessionCr],
    );

    // Determine whether the streak actually incremented this session.
    // The UPDATE increments streak only when streak_last_updated was on a previous
    // calendar day, so comparing the old and new values gives a reliable signal.
    const newStreakCount     = parseInt(updatedUser.rows[0].streak || 0);
    const streakDidIncrement = newStreakCount > streakCount;
    let   streakBonus        = 0;
    let   comebackBonus      = 0;
    let   milestoneClaimed   = null;

    // Comeback bonus — fires when the user completes their first session after a
    // full streak reset (streak was 0 before this session). It rewards the act of
    // returning, not the streak length. Separate from the regular streak bonus so
    // both can display independently in the UI.
    if (streakCount === 0 && newStreakCount === 1) {
      comebackBonus = 50;
      await completeClient.query(
        `UPDATE users SET system_credits = system_credits + $1 WHERE id::text = $2`,
        [comebackBonus, String(task.userId)],
      );
    }

    if (streakDidIncrement) {
      // Flat +50 CR for extending the streak — replaces the old XP multiplier.
      // A multiplier compounds unfairly for long-term users; a flat credit bonus
      // is spendable, visible, and equal in value per session.
      streakBonus = 50;
      await completeClient.query(
        `UPDATE users SET system_credits = system_credits + $1 WHERE id::text = $2`,
        [streakBonus, String(task.userId)],
      );

      const milestoneConfig = STREAK_MILESTONES[newStreakCount];
      if (milestoneConfig) {
        // SAVEPOINT isolates milestone processing from the main transaction.
        // If any milestone SQL fails, ROLLBACK TO SAVEPOINT reverts only the
        // milestone queries — the session completion, XP, loot, and the +50 CR
        // streak bonus above all survive and get committed normally.
        // Without SAVEPOINT, a milestone failure puts the whole transaction into
        // an aborted state, causing the COMMIT below to throw and rolling back
        // the entire session completion.
        await completeClient.query("SAVEPOINT milestone_processing");
        try {
          // INSERT ... ON CONFLICT DO NOTHING — rowCount 1 = first claim, 0 = already claimed.
          // The PRIMARY KEY (user_id, milestone) makes double-award impossible even under
          // concurrent requests — the second INSERT simply returns rowCount 0.
          const milestoneInsert = await completeClient.query(
            `INSERT INTO streak_milestones (user_id, milestone)
             VALUES ($1::integer, $2) ON CONFLICT DO NOTHING`,
            [parseInt(task.userId, 10), newStreakCount],
          );

          if (milestoneInsert.rowCount === 1) {
            await completeClient.query(
              `UPDATE users SET system_credits = system_credits + $1 WHERE id::text = $2`,
              [milestoneConfig.credits, String(task.userId)],
            );

            let milestoneLoot = null;
            if (milestoneConfig.lootRarity) {
              const milestoneLootCredits = CREDIT_BY_RARITY[milestoneConfig.lootRarity] ?? 50;
              await completeClient.query(
                `UPDATE users SET system_credits = system_credits + $1 WHERE id::text = $2`,
                [milestoneLootCredits, String(task.userId)],
              );
              milestoneLoot = { rarity: milestoneConfig.lootRarity, credits_earned: milestoneLootCredits };
            }

            if (milestoneConfig.shieldUnlock) {
              await completeClient.query(
                `UPDATE users SET streak_shield = true WHERE id::text = $1`,
                [String(task.userId)],
              );
            }

            milestoneClaimed = {
              days:            newStreakCount,
              credits_earned:  milestoneConfig.credits,
              loot:            milestoneLoot,
              shield_unlocked: milestoneConfig.shieldUnlock,
            };
          }
          await completeClient.query("RELEASE SAVEPOINT milestone_processing");
        } catch (milestoneError) {
          console.error("[MILESTONE] Processing failed:", milestoneError.message);
          await completeClient.query("ROLLBACK TO SAVEPOINT milestone_processing");
          await completeClient.query("RELEASE SAVEPOINT milestone_processing");
        }
      }
    }

    // Loot drop: guaranteed Epic on first ever session, normal RNG after that.
    // Skipped entirely at zero credit (fully overlapped by another session) —
    // a stacked completion shouldn't also buy an extra loot roll.
    const dropChance = LOOT_DROP_CHANCE;
    let drop = null;
    if (creditableMinutes > 0 && (!first_task_completed || Math.random() < dropChance)) {
      const rarity      = !first_task_completed ? "Epic" : rollRarity(Math.random() * 100);
      const dropCredits = CREDIT_BY_RARITY[rarity] ?? 50;
      await completeClient.query(
        `UPDATE users SET system_credits = system_credits + $1, first_task_completed = true WHERE id = $2`,
        [dropCredits, task.userId],
      );
      drop = { rarity, credits_earned: dropCredits };
    } else if (!first_task_completed) {
      // Still mark first task done even if no drop rolled after the first
      await completeClient.query(
        `UPDATE users SET first_task_completed = true WHERE id = $1`,
        [task.userId],
      );
    }

    await completeClient.query(
      `UPDATE tasks SET status = 'SUCCESS', completed_at = NOW(), credited_minutes = $2 WHERE id::text = $1`,
      [String(id), creditableMinutes],
    );

    await completeClient.query(
      `INSERT INTO daily_stats (user_id, date, focus_minutes)
       VALUES ($1::integer, CURRENT_DATE, $2)
       ON CONFLICT (user_id, date)
       DO UPDATE SET focus_minutes = daily_stats.focus_minutes + EXCLUDED.focus_minutes`,
      [task.userId, creditableMinutes],
    );

    // Evaluated after the task is marked SUCCESS, because the thresholds count
    // completed sessions, and before COMMIT so an unlock can never be credited
    // without the session that earned it committing too.
    //
    // Wrapped in a SAVEPOINT for the same reason the milestone block above is:
    // achievements are a bonus, and a failure here must never cost someone the
    // XP, credits and loot they already earned. Postgres aborts the whole
    // transaction on any error, so a bare try/catch would not be enough — the
    // savepoint is what lets the session completion survive.
    let unlockedAchievements = [];
    await completeClient.query("SAVEPOINT achievements");
    try {
      unlockedAchievements = await evaluateAchievements(task.userId, completeClient);
      await completeClient.query("RELEASE SAVEPOINT achievements");
    } catch (achievementErr) {
      await completeClient.query("ROLLBACK TO SAVEPOINT achievements");
      console.error("[achievements] evaluation failed, session completed anyway:", achievementErr.message);
      unlockedAchievements = [];
    }

    // evaluateAchievements pays its loot inside the same transaction, which makes
    // the user row read earlier in this handler stale the moment anything unlocked.
    let finalUserRow = updatedUser.rows[0];
    if (unlockedAchievements.length > 0) {
      const refreshedUser = await completeClient.query("SELECT * FROM users WHERE id = $1", [task.userId]);
      if (refreshedUser.rows[0]) finalUserRow = refreshedUser.rows[0];
    }

    await completeClient.query("COMMIT");

    trackEvent(externalId, "session_completed", {
      duration_minutes: parseInt(task.durationMinutes) || 0,
      credited_minutes: creditableMinutes,
      overlap_minutes:  overlapMinutes,
      skill:            completedSkillName,
      xp_earned:        totalXpGained,
      credits_earned:   sessionCr,
      drop_rarity:      drop?.rarity ?? null,
      streak:           finalUserRow?.streak ?? 0,
      tier:             finalUserRow?.account_tier ?? 0,
      hour_of_day:      new Date().getHours(),
      leveled_up:       Boolean(leveledUp),
    });

    // Emitted separately so unlock rate and threshold tuning can be read without
    // unpacking arrays out of session events.
    for (const achievement of unlockedAchievements) {
      trackEvent(externalId, "achievement_unlocked", {
        key:      achievement.key,
        category: achievement.category,
        rarity:   achievement.lootRarity,
      });
    }

    // Lets every other event be segmented by tier and progression later.
    identifyUser(externalId, {
      tier:   finalUserRow?.account_tier ?? 0,
      level:  finalUserRow?.level ?? 1,
      streak: finalUserRow?.streak ?? 0,
    });

    // Push real-time patch to any connected SSE client before sending response
    pushUserPatch(externalId).catch(() => {});
    presenceMap.delete(externalId);
    broadcastPresence();

    res.json({
      success:          true,
      reward:           totalXpGained,
      credits_earned:   sessionCr,
      xp_earned:        totalXpGained,
      skill_name:       completedSkillName,
      user:             finalUserRow,
      achievements_unlocked: unlockedAchievements,
      drop,
      leveledUp,
      newLevel:         globalLevel,
      skillLeveledUp,
      skillHit99,
      newSkillLevel:    returnedSkillLevel,
      streak_bonus:     streakBonus,
      comeback_bonus:   comebackBonus,
      milestone:        milestoneClaimed,
      credited_minutes: creditableMinutes,
      overlap_minutes:  overlapMinutes,
      skill_milestone_credits: skillMilestoneCreditsEarned,
    });
  } catch (err) {
    await completeClient.query("ROLLBACK");
    console.error("TASK_COMPLETION_ERROR:", err.message);
    captureException(err, externalId, { route: "task_complete" });
    res.status(500).json({ error: err.message });
  } finally {
    completeClient.release();
  }
});

router.post("/api/tasks/:id/fail", requireAuth, mutationLimiter, async (req, res) => {
  const { id } = req.params;
  const externalId = req.auth.userId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const contractRes = await client.query(
      `SELECT tasks.stake_amount, tasks.user_id, tasks.status, tasks.created_at,
              (NOW() >= tasks.deadline) AS deadline_passed,
              users.streak_shield,
              COALESCE(users.role, 'FREE') AS role
       FROM tasks
       JOIN users ON tasks.user_id::text = users.id::text
       WHERE tasks.id::text = $1 AND users.external_id::text = $2`,
      [String(id), String(externalId)],
    );

    if (contractRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).send("Mission not found");
    }
    const { stake_amount, user_id, status, created_at, deadline_passed, streak_shield, role } = contractRes.rows[0];

    if (status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).send("Mission already processed");
    }

    const elapsedSeconds = (Date.now() - new Date(created_at).getTime()) / 1000;
    const inGrace = elapsedSeconds <= 60 || deadline_passed;

    await client.query("UPDATE tasks SET status = 'FAILED' WHERE id = $1", [id]);

    // How far in people quit is the useful part — abandoning at 10% is a "picked
    // the wrong length" problem, abandoning at 85% is a session-length problem.
    trackEvent(externalId, "session_abandoned", {
      elapsed_seconds: Math.round(elapsedSeconds),
      in_grace_period: inGrace,
      deadline_passed: Boolean(deadline_passed),
      shield_used:     Boolean(streak_shield) && !inGrace,
    });

    if (inGrace) {
      await client.query("COMMIT");
      pushUserPatch(externalId).catch(() => {});
      presenceMap.delete(externalId);
      broadcastPresence();
      return res.json({ streak_shield_used: false, grace_period: true });
    }

    // Shield absorbs the streak break — ELITE gets it auto-restored immediately.
    if (streak_shield) {
      const eliteAutoReplenish = role === "ELITE";
      const userUpdate = await client.query(
        `UPDATE users
         SET streak_shield = $1,
             strikes = COALESCE(strikes, 0) + 1
         WHERE id = $2
         RETURNING *`,
        [eliteAutoReplenish, user_id],
      );
      await client.query("COMMIT");
      pushUserPatch(externalId).catch(() => {});
      presenceMap.delete(externalId);
      broadcastPresence();
      return res.json({ ...userUpdate.rows[0], streak_shield_used: true, shield_replenished: eliteAutoReplenish });
    }

    const userUpdate = await client.query(
      `UPDATE users
       SET streak  = 0,
           strikes = COALESCE(strikes, 0) + 1
       WHERE id = $1
       RETURNING *`,
      [user_id],
    );

    await client.query("COMMIT");
    pushUserPatch(externalId).catch(() => {});
    presenceMap.delete(externalId);
    broadcastPresence();
    res.json({ ...userUpdate.rows[0], streak_shield_used: false });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ABORT_SEQUENCE_FAILED:", err);
    res.status(500).send("ABORT_SEQUENCE_FAILED");
  } finally {
    client.release();
  }
});

module.exports = router;
