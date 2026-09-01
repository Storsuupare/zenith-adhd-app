const { crossedSkillLevelMilestones, SKILL_LEVEL_MILESTONES } = require("../lib/economy.js");

describe("crossedSkillLevelMilestones", () => {
  it("returns nothing when no threshold is crossed", () => {
    expect(crossedSkillLevelMilestones(5, 9)).toEqual([]);
  });

  it("returns the single threshold crossed by a normal level-up", () => {
    expect(crossedSkillLevelMilestones(9, 10)).toEqual([10]);
  });

  it("returns every threshold crossed by a big XP jump in one session", () => {
    expect(crossedSkillLevelMilestones(8, 22)).toEqual([10, 20]);
  });

  it("does not re-return a threshold already passed before this session", () => {
    expect(crossedSkillLevelMilestones(15, 18)).toEqual([]);
  });

  it("includes the top boundary exactly on it", () => {
    expect(crossedSkillLevelMilestones(85, 90)).toEqual([90]);
  });

  it("returns nothing for a skill already past every milestone", () => {
    expect(crossedSkillLevelMilestones(95, 99)).toEqual([]);
  });
});

describe("SKILL_LEVEL_MILESTONES", () => {
  it("stays below the minimum first-prestige reward so prestige remains the bigger moment", () => {
    const MYTHIC_CREDITS = 3500;
    for (const reward of Object.values(SKILL_LEVEL_MILESTONES)) {
      expect(reward).toBeLessThan(MYTHIC_CREDITS);
    }
  });
});
