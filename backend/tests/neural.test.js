const { getNeuralMult, applyPrestigeImmunity } = require("../lib/economy.js");

describe("getNeuralMult", () => {
  it("returns 0.5 during REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(2);
    expect(getNeuralMult()).toBe(0.5);
    jest.restoreAllMocks();
  });

  it("returns 1.25 during Peak window", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(9);
    expect(getNeuralMult()).toBe(1.25);
    jest.restoreAllMocks();
  });

  it("returns 1.5 during Hyperfocus window", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(23);
    expect(getNeuralMult()).toBe(1.5);
    jest.restoreAllMocks();
  });

  it("returns 1.0 during normal hours", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(14);
    expect(getNeuralMult()).toBe(1.0);
    jest.restoreAllMocks();
  });
});

describe("applyPrestigeImmunity", () => {
  it("floors REDZONE's 0.5 penalty to 1.0 for a prestiged skill", () => {
    expect(applyPrestigeImmunity(0.5, 1)).toBe(1.0);
  });

  it("stays immune at higher prestige levels too", () => {
    expect(applyPrestigeImmunity(0.5, 3)).toBe(1.0);
  });

  it("does NOT floor the REDZONE penalty for a never-prestiged skill", () => {
    expect(applyPrestigeImmunity(0.5, 0)).toBe(0.5);
  });

  it("does not cap the Peak bonus for a prestiged skill", () => {
    expect(applyPrestigeImmunity(1.25, 1)).toBe(1.25);
  });

  it("does not cap the Hyperfocus bonus for a prestiged skill", () => {
    expect(applyPrestigeImmunity(1.5, 1)).toBe(1.5);
  });

  it("leaves the standard 1.0 multiplier unchanged regardless of prestige", () => {
    expect(applyPrestigeImmunity(1.0, 2)).toBe(1.0);
  });
});