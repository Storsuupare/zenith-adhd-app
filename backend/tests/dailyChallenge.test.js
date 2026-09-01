const { getTodayChallenge, CHALLENGES } = require("../lib/dailyChallenge.js");

describe("getTodayChallenge", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("always returns one of the defined challenges", () => {
    const challenge = getTodayChallenge();
    expect(CHALLENGES).toContainEqual(challenge);
  });

  it("picks challenge index 1 on Jan 1 UTC (day-of-year 1)", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(getTodayChallenge()).toEqual(CHALLENGES[1]);
  });

  it("picks challenge index 2 on Jan 2 UTC (day-of-year 2)", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-02T00:00:00Z"));
    expect(getTodayChallenge()).toEqual(CHALLENGES[2]);
  });

  it("wraps around after 7 days, landing back on the same challenge as Jan 1", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-08T00:00:00Z"));
    expect(getTodayChallenge()).toEqual(CHALLENGES[1]);
  });

  it("stays on the same challenge across the day, not just at midnight UTC", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T23:59:00Z"));
    expect(getTodayChallenge()).toEqual(CHALLENGES[1]);
  });
});
