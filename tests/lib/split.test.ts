import { describe, expect, it } from "vitest";
import { splitEqually } from "@/lib/split";

describe("splitEqually", () => {
  it("splits an evenly divisible amount equally", () => {
    const shares = splitEqually(4500, ["a", "b", "c"]);
    expect(shares).toEqual([
      { userId: "a", shareCents: 1500 },
      { userId: "b", shareCents: 1500 },
      { userId: "c", shareCents: 1500 },
    ]);
  });

  it("distributes remainder cents so shares sum exactly to the total ($10 across 3 people)", () => {
    const shares = splitEqually(1000, ["a", "b", "c"]);
    expect(shares).toEqual([
      { userId: "a", shareCents: 334 },
      { userId: "b", shareCents: 333 },
      { userId: "c", shareCents: 333 },
    ]);
    const sum = shares.reduce((total, s) => total + s.shareCents, 0);
    expect(sum).toBe(1000);
  });

  it("gives the full amount to a single member", () => {
    expect(splitEqually(999, ["a"])).toEqual([{ userId: "a", shareCents: 999 }]);
  });

  it("always produces shares that sum exactly to the total", () => {
    const cases: [number, number][] = [
      [1000, 3],
      [101, 7],
      [1, 3],
      [999999, 13],
      [200, 4],
    ];

    for (const [total, count] of cases) {
      const memberIds = Array.from({ length: count }, (_, i) => `member-${i}`);
      const shares = splitEqually(total, memberIds);
      const sum = shares.reduce((acc, s) => acc + s.shareCents, 0);
      expect(sum).toBe(total);
    }
  });

  it("rejects an empty member list", () => {
    expect(() => splitEqually(1000, [])).toThrow();
  });

  it("rejects a non-positive amount", () => {
    expect(() => splitEqually(0, ["a"])).toThrow();
    expect(() => splitEqually(-100, ["a"])).toThrow();
  });
});
