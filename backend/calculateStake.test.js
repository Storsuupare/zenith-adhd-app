const { calculateStake } = require("./server");

describe("calculateStake", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Known durations ───────────────────────────────────────────────────────

  it("returns 250 for a 5-minute session outside REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(calculateStake(5)).toBe(250);
  });

  it("returns 4000 for a 30-minute session outside REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(calculateStake(30)).toBe(4000);
  });

  it("returns 10000 for a 60-minute session outside REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(calculateStake(60)).toBe(10000);
  });

  it("returns 30000 for a 120-minute session outside REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(calculateStake(120)).toBe(30000);
  });

  // ── REDZONE halves the stake ──────────────────────────────────────────────

  it("halves the stake during REDZONE at midnight", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(0);
    expect(calculateStake(30)).toBe(2000);
  });

  it("halves the stake during REDZONE at 4AM", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(4);
    expect(calculateStake(60)).toBe(5000);
  });

  it("does NOT halve the stake at 5AM — REDZONE is over", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(5);
    expect(calculateStake(30)).toBe(4000);
  });

  // ── Unknown duration fallback ─────────────────────────────────────────────

  it("falls back to duration * 10 for an unknown duration", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(calculateStake(45)).toBe(450);
  });

  it("halves the fallback during REDZONE", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(2);
    expect(calculateStake(45)).toBe(225);
  });
});
