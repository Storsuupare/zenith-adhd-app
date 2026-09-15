const { applyRankXpMultiplier } = require("../lib/economy.js");

describe("applyRankXpMultiplier", () => {
  it("returns 75% of the session's total XP gain, floored", () => {
    expect(applyRankXpMultiplier(100)).toBe(75);
  });

  it("floors a non-integer result", () => {
    expect(applyRankXpMultiplier(101)).toBe(75);
  });

  it("returns 0 for a 0 XP session", () => {
    expect(applyRankXpMultiplier(0)).toBe(0);
  });

  it("scales linearly with larger XP amounts", () => {
    expect(applyRankXpMultiplier(1000)).toBe(750);
  });
});
