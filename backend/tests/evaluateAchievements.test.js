const { evaluateAchievements } = require("../achievementService.js");
const { CREDIT_BY_RARITY } = require("../LootData.js");

// evaluateAchievements takes the pg client as an argument, so it can be tested
// against a fake one — no database, no network, same as the other suites here.
//
// The real function issues four shapes of query, in this order:
//   1. the stats SELECT            → one row of snake_case totals
//   2. SELECT achievement_key ...  → keys the user already has
//   3. INSERT ... RETURNING        → rowCount 1 on success, 0 if it already existed
//   4. UPDATE users SET system_credits ... → only when something paid out
function createMockClient({ stats = {}, alreadyUnlocked = [], insertsThatConflict = [] } = {}) {
  const statsRow = {
    sessions_completed:  stats.sessionsCompleted  ?? 0,
    focus_minutes:       stats.focusMinutes       ?? 0,
    peak_sessions:       stats.peakSessions       ?? 0,
    hyperfocus_sessions: stats.hyperfocusSessions ?? 0,
    highest_skill_level: stats.highestSkillLevel  ?? 0,
    skills_above_ten:    stats.skillsAboveTen     ?? 0,
    prestige_total:      stats.prestigeTotal      ?? 0,
    best_streak:         stats.bestStreak         ?? 0,
    themes_owned:        stats.themesOwned        ?? 0,
  };

  const issued = { inserted: [], creditUpdates: [] };

  const client = {
    issued,
    async query(sql, params) {
      if (sql.includes("FROM tasks WHERE user_id")) {
        return { rows: [statsRow], rowCount: 1 };
      }
      if (sql.includes("SELECT achievement_key FROM user_achievements")) {
        return { rows: alreadyUnlocked.map(key => ({ achievement_key: key })), rowCount: alreadyUnlocked.length };
      }
      if (sql.includes("INSERT INTO user_achievements")) {
        const key = params[1];
        // Simulates ON CONFLICT DO NOTHING finding an existing row.
        if (insertsThatConflict.includes(key)) return { rows: [], rowCount: 0 };
        issued.inserted.push(key);
        return { rows: [{ achievement_key: key }], rowCount: 1 };
      }
      if (sql.includes("UPDATE users SET system_credits")) {
        issued.creditUpdates.push(params[0]);
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query in test: ${sql.slice(0, 60)}`);
    },
  };

  return client;
}

describe("evaluateAchievements", () => {
  it("unlocks nothing for a brand new account with no activity", async () => {
    const client = createMockClient();
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked).toEqual([]);
    expect(client.issued.inserted).toEqual([]);
    expect(client.issued.creditUpdates).toEqual([]);
  });

  it("unlocks the first-session achievement after one session", async () => {
    const client = createMockClient({ stats: { sessionsCompleted: 1 } });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked.map(entry => entry.key)).toContain("sessions_1");
  });

  it("does not unlock a threshold that has not been reached", async () => {
    const client = createMockClient({ stats: { sessionsCompleted: 9 } });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked.map(entry => entry.key)).toContain("sessions_1");
    expect(unlocked.map(entry => entry.key)).not.toContain("sessions_10");
  });

  it("unlocks exactly on the threshold, not one short", async () => {
    const client = createMockClient({ stats: { sessionsCompleted: 10 } });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked.map(entry => entry.key)).toContain("sessions_10");
  });

  it("skips achievements the user already holds", async () => {
    const client = createMockClient({
      stats: { sessionsCompleted: 10 },
      alreadyUnlocked: ["sessions_1", "sessions_10"],
    });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked).toEqual([]);
    expect(client.issued.inserted).toEqual([]);
  });

  it("pays the loot value of each newly unlocked achievement, once", async () => {
    // 10 sessions crosses sessions_1 (no reward) and sessions_10 (Uncommon).
    const client = createMockClient({
      stats: { sessionsCompleted: 10 },
      alreadyUnlocked: ["sessions_1"],
    });
    await evaluateAchievements(1, client);

    expect(client.issued.creditUpdates).toEqual([CREDIT_BY_RARITY.Uncommon]);
  });

  it("awards no credits for recognition-only achievements", async () => {
    // sessions_1 and minutes_60 both have lootRarity null.
    const client = createMockClient({ stats: { sessionsCompleted: 1, focusMinutes: 60 } });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked.map(entry => entry.key).sort()).toEqual(["minutes_60", "sessions_1"]);
    expect(client.issued.creditUpdates).toEqual([]);
  });

  it("does not pay twice when the insert hits an existing row", async () => {
    // Simulates two session completions racing: the row is already there, so
    // ON CONFLICT DO NOTHING returns rowCount 0 and the reward must be skipped.
    const client = createMockClient({
      stats: { sessionsCompleted: 10 },
      insertsThatConflict: ["sessions_10"],
    });
    await evaluateAchievements(1, client);

    expect(client.issued.inserted).not.toContain("sessions_10");
    expect(client.issued.creditUpdates).toEqual([]);
  });

  it("sums the payout when several achievements unlock at once", async () => {
    // A 30-day streak crosses streak_7 (Uncommon), streak_14 (Rare) and streak_30 (Epic).
    const client = createMockClient({ stats: { bestStreak: 30 } });
    await evaluateAchievements(1, client);

    const expectedTotal =
      CREDIT_BY_RARITY.Uncommon + CREDIT_BY_RARITY.Rare + CREDIT_BY_RARITY.Epic;
    expect(client.issued.creditUpdates).toEqual([expectedTotal]);
  });

  it("keeps streak achievements earned after the streak resets", async () => {
    // Streak is back to 0, but the unlock already exists — it must not be
    // re-awarded, and nothing should be revoked.
    const client = createMockClient({
      stats: { bestStreak: 0 },
      alreadyUnlocked: ["streak_7", "streak_14", "streak_30"],
    });
    const unlocked = await evaluateAchievements(1, client);

    expect(unlocked).toEqual([]);
    expect(client.issued.creditUpdates).toEqual([]);
  });

  it("returns the detail the app needs to show a toast", async () => {
    const client = createMockClient({ stats: { sessionsCompleted: 10 }, alreadyUnlocked: ["sessions_1"] });
    const [unlockedEntry] = await evaluateAchievements(1, client);

    expect(unlockedEntry).toMatchObject({
      key:        "sessions_10",
      title:      expect.any(String),
      category:   "Sessions",
      lootRarity: "Uncommon",
      credits:    CREDIT_BY_RARITY.Uncommon,
    });
  });
});
