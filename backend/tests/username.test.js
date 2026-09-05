const { isValidUsernameFormat, isReservedUsername } = require("../lib/validation.js");

describe("isValidUsernameFormat", () => {
  it("accepts a normal alphanumeric handle", () => {
    expect(isValidUsernameFormat("golfer_42")).toBe(true);
  });

  it("rejects anything shorter than 3 characters", () => {
    expect(isValidUsernameFormat("ab")).toBe(false);
  });

  it("rejects anything longer than 20 characters", () => {
    expect(isValidUsernameFormat("a".repeat(21))).toBe(false);
  });

  it("accepts exactly 3 and exactly 20 characters", () => {
    expect(isValidUsernameFormat("abc")).toBe(true);
    expect(isValidUsernameFormat("a".repeat(20))).toBe(true);
  });

  it("rejects spaces", () => {
    expect(isValidUsernameFormat("golf er")).toBe(false);
  });

  it("rejects punctuation outside underscore", () => {
    expect(isValidUsernameFormat("golfer.42")).toBe(false);
    expect(isValidUsernameFormat("golfer-42")).toBe(false);
    expect(isValidUsernameFormat("golfer@42")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidUsernameFormat(12345)).toBe(false);
    expect(isValidUsernameFormat(null)).toBe(false);
    expect(isValidUsernameFormat(undefined)).toBe(false);
  });
});

describe("isReservedUsername", () => {
  it("rejects the brand name", () => {
    expect(isReservedUsername("zenith")).toBe(true);
  });

  it("rejects staff-impersonating terms", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("moderator")).toBe(true);
    expect(isReservedUsername("support")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isReservedUsername("ZeNiTh")).toBe(true);
  });

  it("catches separator-obfuscated attempts", () => {
    expect(isReservedUsername("ze_nith")).toBe(true);
    expect(isReservedUsername("ze.nith")).toBe(true);
  });

  it("allows a normal username that isn't reserved", () => {
    expect(isReservedUsername("golfer_42")).toBe(false);
  });
});
