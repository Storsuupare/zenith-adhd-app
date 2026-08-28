const { getNeuralMult } = require("../lib/economy.js");

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