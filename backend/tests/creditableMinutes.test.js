const { computeCreditableMinutes } = require("../lib/economy.js");

// Minutes past midnight on a fixed reference date — keeps every test case
// readable as plain minute offsets instead of full timestamps.
const T = (mins) => new Date(2026, 0, 1, 0, mins, 0);

describe("computeCreditableMinutes", () => {
  it("returns the full duration when there is no overlap at all", () => {
    expect(computeCreditableMinutes(T(0), T(30), [])).toBe(30);
  });

  it("returns zero when fully covered by a single earlier completed task", () => {
    const other = [{ start: T(0), end: T(30) }];
    expect(computeCreditableMinutes(T(10), T(20), other)).toBe(0);
  });

  it("returns the uncovered remainder for a partial overlap", () => {
    const other = [{ start: T(20), end: T(50) }]; // overlaps the last 10 minutes
    expect(computeCreditableMinutes(T(0), T(30), other)).toBe(20);
  });

  it("merges overlapping earlier windows instead of double-subtracting", () => {
    const other = [
      { start: T(10), end: T(30) },
      { start: T(20), end: T(40) }, // overlaps the first — must not be subtracted twice
    ];
    // covered = [10,40) = 30 minutes, creditable = 60 - 30 = 30
    expect(computeCreditableMinutes(T(0), T(60), other)).toBe(30);
  });

  it("sums separate overlaps with a gap between them", () => {
    const other = [
      { start: T(0),  end: T(10) },
      { start: T(50), end: T(60) },
    ];
    // covered = 10 + 10 = 20, creditable = 60 - 20 = 40
    expect(computeCreditableMinutes(T(0), T(60), other)).toBe(40);
  });

  it("does not count a window that only touches the boundary, not overlaps", () => {
    const other = [{ start: T(0), end: T(10) }]; // ends exactly when this task starts
    expect(computeCreditableMinutes(T(10), T(20), other)).toBe(10);
  });

  it("ignores windows entirely outside this task's own range", () => {
    const other = [{ start: T(100), end: T(120) }];
    expect(computeCreditableMinutes(T(10), T(20), other)).toBe(10);
  });

  it("never returns a negative value even if somehow over-covered", () => {
    const other = [{ start: T(-10), end: T(40) }]; // wider than the task itself
    expect(computeCreditableMinutes(T(0), T(30), other)).toBe(0);
  });
});
