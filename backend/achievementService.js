const { ACHIEVEMENTS, ACHIEVEMENTS_BY_KEY } = require("./achievements.js");
const { CREDIT_BY_RARITY } = require("./LootData.js");

// Neural Clock windows, kept in step with getNeuralMult() in server.js.
const PEAK_HOURS       = [8, 9, 10];
const HYPERFOCUS_HOURS = [22, 23];

/**
 * Reads every stat the achievement definitions can key off, in one round trip.
 * `userId` is the internal users.id; tasks.user_id is stored as text, hence the casts.
 */
async function buildAchievementStats(userId, client) {
  const statsResult = await client.query(
    `SELECT
       (SELECT COUNT(*)                          FROM tasks WHERE user_id::text = $1::text AND status = 'SUCCESS')                                      AS sessions_completed,
       (SELECT COALESCE(SUM(duration_minutes),0) FROM tasks WHERE user_id::text = $1::text AND status = 'SUCCESS')                                      AS focus_minutes,
       (SELECT COUNT(*)                          FROM tasks WHERE user_id::text = $1::text AND status = 'SUCCESS'
                                                              AND EXTRACT(HOUR FROM completed_at) = ANY($2::int[]))                                     AS peak_sessions,
       (SELECT COUNT(*)                          FROM tasks WHERE user_id::text = $1::text AND status = 'SUCCESS'
                                                              AND EXTRACT(HOUR FROM completed_at) = ANY($3::int[]))                                     AS hyperfocus_sessions,
       (SELECT COALESCE(MAX(level),0)            FROM user_skills WHERE user_id = $1::int)                                                              AS highest_skill_level,
       (SELECT COUNT(*)                          FROM user_skills WHERE user_id = $1::int AND level > 10)                                               AS skills_above_ten,
       (SELECT COALESCE(SUM(prestige_level),0)   FROM user_skills WHERE user_id = $1::int)                                                              AS prestige_total,
       (SELECT COALESCE(streak,0)                FROM users WHERE id = $1::int)                                                                         AS best_streak,
       (SELECT jsonb_array_length(COALESCE(purchased_cosmetics, '[]'::jsonb)) FROM users WHERE id = $1::int)                                            AS themes_owned`,
    [String(userId), PEAK_HOURS, HYPERFOCUS_HOURS],
  );

  const row = statsResult.rows[0] ?? {};
  return {
    sessionsCompleted:  Number(row.sessions_completed   ?? 0),
    focusMinutes:       Number(row.focus_minutes        ?? 0),
    peakSessions:       Number(row.peak_sessions        ?? 0),
    hyperfocusSessions: Number(row.hyperfocus_sessions  ?? 0),
    highestSkillLevel:  Number(row.highest_skill_level  ?? 0),
    skillsAboveTen:     Number(row.skills_above_ten     ?? 0),
    prestigeTotal:      Number(row.prestige_total       ?? 0),
    bestStreak:         Number(row.best_streak          ?? 0),
    themesOwned:        Number(row.themes_owned         ?? 0),
  };
}

/**
 * Unlocks any achievement whose threshold the user now meets, and pays the
 * guaranteed loot roll attached to it. Unlocks are never revoked — a streak
 * achievement stays earned after the streak breaks.
 *
 * Runs inside the caller's transaction so an unlock can't be credited without
 * the session that earned it also committing. Returns the newly unlocked
 * definitions so the caller can surface them in the response.
 */
async function evaluateAchievements(userId, client) {
  const stats = await buildAchievementStats(userId, client);

  const alreadyUnlocked = await client.query(
    "SELECT achievement_key FROM user_achievements WHERE user_id = $1",
    [userId],
  );
  const unlockedKeys = new Set(alreadyUnlocked.rows.map(row => row.achievement_key));

  const newlyUnlocked = ACHIEVEMENTS.filter(
    definition => !unlockedKeys.has(definition.key) && stats[definition.metric] >= definition.threshold,
  );
  if (newlyUnlocked.length === 0) return [];

  let creditsAwarded = 0;
  for (const definition of newlyUnlocked) {
    // ON CONFLICT guards against two concurrent session completions racing to
    // unlock the same achievement and paying its reward twice.
    const insertResult = await client.query(
      `INSERT INTO user_achievements (user_id, achievement_key)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_key) DO NOTHING
       RETURNING achievement_key`,
      [userId, definition.key],
    );
    if (insertResult.rowCount === 0) continue;
    if (definition.lootRarity) creditsAwarded += CREDIT_BY_RARITY[definition.lootRarity] ?? 0;
  }

  if (creditsAwarded > 0) {
    await client.query(
      "UPDATE users SET system_credits = COALESCE(system_credits, 0) + $1 WHERE id = $2",
      [creditsAwarded, userId],
    );
  }

  return newlyUnlocked.map(definition => ({
    key:         definition.key,
    title:       definition.title,
    description: definition.description,
    category:    definition.category,
    lootRarity:  definition.lootRarity,
    credits:     definition.lootRarity ? (CREDIT_BY_RARITY[definition.lootRarity] ?? 0) : 0,
  }));
}

module.exports = { ACHIEVEMENTS, ACHIEVEMENTS_BY_KEY, buildAchievementStats, evaluateAchievements };
