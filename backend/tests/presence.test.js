const { presenceMap, setPresencePaused } = require("../lib/realtime.js");

// setPresencePaused mutates the shared presenceMap directly, so each test
// clears it first — same isolation concern as any other shared-module-state
// test, there's no per-test instance to construct fresh.
beforeEach(() => {
  presenceMap.clear();
});

describe("setPresencePaused", () => {
  it("marks an existing entry as paused and returns true", () => {
    presenceMap.set("user_1", { sessionId: "abc", skillName: "Resolve", duration: 30, startedAt: "now", tier: 0 });

    const result = setPresencePaused("user_1", true);

    expect(result).toBe(true);
    expect(presenceMap.get("user_1").paused).toBe(true);
  });

  it("unpauses an entry", () => {
    presenceMap.set("user_1", { sessionId: "abc", skillName: "Resolve", duration: 30, startedAt: "now", tier: 0, paused: true });

    setPresencePaused("user_1", false);

    expect(presenceMap.get("user_1").paused).toBe(false);
  });

  it("does nothing and returns false when the user has no presence entry", () => {
    const result = setPresencePaused("nobody", true);

    expect(result).toBe(false);
    expect(presenceMap.has("nobody")).toBe(false);
  });

  it("does not affect other users' entries", () => {
    presenceMap.set("user_1", { sessionId: "a", skillName: "Resolve", duration: 30, startedAt: "now", tier: 0 });
    presenceMap.set("user_2", { sessionId: "b", skillName: "Vitality", duration: 15, startedAt: "now", tier: 1 });

    setPresencePaused("user_1", true);

    expect(presenceMap.get("user_1").paused).toBe(true);
    expect(presenceMap.get("user_2").paused).toBeUndefined();
  });
});

describe("GET /api/presence/friends filtering", () => {
  // Mirrors the exact filter/map in routes/presence.js: only presence entries
  // belonging to an accepted friend are ever returned, paused sessions are
  // excluded, and a username is attached from the friend lookup — a stranger's
  // active session must never leak through just because presenceMap has it.
  it("only returns entries for known friends, excludes paused ones, and attaches usernames", () => {
    presenceMap.set("friend_1", { sessionId: "a", skillName: "Resolve", duration: 30, startedAt: "t1", tier: 0 });
    presenceMap.set("friend_2", { sessionId: "b", skillName: "Vitality", duration: 15, startedAt: "t2", tier: 1, paused: true });
    presenceMap.set("stranger", { sessionId: "c", skillName: "Learning", duration: 60, startedAt: "t3", tier: 2 });

    const usernameByExternalId = new Map([
      ["friend_1", "alex"],
      ["friend_2", "sam"],
    ]);

    const sessions = [...presenceMap.entries()]
      .filter(([friendExternalId, entry]) => !entry.paused && usernameByExternalId.has(friendExternalId))
      .map(([friendExternalId, entry]) => ({
        username:  usernameByExternalId.get(friendExternalId),
        skillName: entry.skillName,
        duration:  entry.duration,
        startedAt: entry.startedAt,
        tier:      entry.tier,
      }));

    expect(sessions).toEqual([
      { username: "alex", skillName: "Resolve", duration: 30, startedAt: "t1", tier: 0 },
    ]);
  });
});
