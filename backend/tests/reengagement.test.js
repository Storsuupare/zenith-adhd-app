const { isEligibleForReengagementPush } = require("../lib/economy.js");

describe("isEligibleForReengagementPush", () => {
  it("returns false for a user active earlier today", () => {
    expect(isEligibleForReengagementPush(0)).toBe(false);
  });

  it("returns false just under the 7-day threshold", () => {
    expect(isEligibleForReengagementPush(6)).toBe(false);
  });

  it("returns true exactly at the 7-day threshold", () => {
    expect(isEligibleForReengagementPush(7)).toBe(true);
  });

  it("returns true for a user gone much longer than 7 days", () => {
    expect(isEligibleForReengagementPush(30)).toBe(true);
  });
});
