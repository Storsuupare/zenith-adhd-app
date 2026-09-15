const { crossedFocusTimeMilestones, FOCUS_TIME_MILESTONES } = require("../lib/economy.js");

describe("crossedFocusTimeMilestones", () => {
  it("returns nothing when no threshold is crossed", () => {
    expect(crossedFocusTimeMilestones(100, 500)).toEqual([]);
  });

  it("returns the 15h threshold (900 minutes) when crossed", () => {
    expect(crossedFocusTimeMilestones(890, 910)).toEqual([900]);
  });

  it("returns every threshold crossed by a big jump in one session", () => {
    expect(crossedFocusTimeMilestones(800, 3100)).toEqual([900, 3000]);
  });

  it("does not re-return a threshold already passed before this session", () => {
    expect(crossedFocusTimeMilestones(1000, 1500)).toEqual([]);
  });

  it("includes the top boundary exactly on it", () => {
    expect(crossedFocusTimeMilestones(2990, 3000)).toEqual([3000]);
  });

  it("returns nothing once every milestone has already been passed", () => {
    expect(crossedFocusTimeMilestones(6000, 6500)).toEqual([]);
  });
});

describe("FOCUS_TIME_MILESTONES", () => {
  it("escalates credits with each threshold", () => {
    const thresholds = Object.keys(FOCUS_TIME_MILESTONES).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < thresholds.length; i++) {
      expect(FOCUS_TIME_MILESTONES[thresholds[i]].credits).toBeGreaterThan(FOCUS_TIME_MILESTONES[thresholds[i - 1]].credits);
    }
  });
});
