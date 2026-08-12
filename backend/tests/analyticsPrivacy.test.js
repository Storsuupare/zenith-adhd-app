const { assertNoUserContent } = require("../analytics.js");

// The one guarantee in the analytics layer that actually matters: a user's own
// words never leave the server. Task titles here read like "call doctor about my
// meds" — private, health-adjacent, and belonging to EU users. These tests exist
// so a future event added in a hurry fails the build instead of the user.
describe("analytics privacy guard", () => {
  describe("allows legitimate event properties", () => {
    it("accepts the real session_started payload", () => {
      expect(() =>
        assertNoUserContent({ duration_minutes: 30, skill: "Logic Flow", tier: 1, hour_of_day: 14 }),
      ).not.toThrow();
    });

    it("accepts the real session_completed payload", () => {
      expect(() =>
        assertNoUserContent({
          duration_minutes: 60, skill: "Environment", xp_earned: 10000,
          credits_earned: 220, drop_rarity: "Legendary", streak: 12,
          tier: 0, hour_of_day: 9, leveled_up: true,
        }),
      ).not.toThrow();
    });

    it("accepts the real achievement_unlocked payload", () => {
      expect(() =>
        assertNoUserContent({ key: "skills_all_10", category: "Skills", rarity: "Epic" }),
      ).not.toThrow();
    });

    it("accepts nulls and booleans", () => {
      expect(() => assertNoUserContent({ drop_rarity: null, leveled_up: false })).not.toThrow();
    });
  });

  describe("rejects user-authored fields by name", () => {
    it.each([
      "title",
      "task_title",
      "taskTitle",
      "TITLE",
      "session_title",
      "name",
      "username",
      "email",
      "note",
      "description",
      "message",
      "label",
      "comment",
    ])("rejects a property called %s", (key) => {
      expect(() => assertNoUserContent({ [key]: "call doctor about my meds" })).toThrow(/refusing to send/);
    });
  });

  it("rejects a title smuggled inside a nested object", () => {
    expect(() =>
      assertNoUserContent({ task: { id: 12, title: "call doctor about my meds" } }),
    ).toThrow(/task\.title/);
  });

  it("rejects free text hiding under an innocent key name", () => {
    // The case a banned-name list can never cover on its own.
    expect(() =>
      assertNoUserContent({
        detail: "Finish the tax return before Friday or the accountant will chase me again",
      }),
    ).toThrow(/looks like free text/);
  });

  it("names the offending path so the failure is actionable", () => {
    expect(() => assertNoUserContent({ session: { meta: { note: "x" } } })).toThrow(/session\.meta\.note/);
  });

  it("allows a short string but rejects a long one under the same key", () => {
    expect(() => assertNoUserContent({ skill: "Logic Flow" })).not.toThrow();
    expect(() => assertNoUserContent({ skill: "L".repeat(65) })).toThrow(/free text/);
  });
});
