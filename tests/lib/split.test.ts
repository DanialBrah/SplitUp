import { describe, expect, it } from "vitest";
import {
  parsePercentageToBasisPoints,
  splitByExactAmounts,
  splitByPercentages,
  splitEqually,
} from "@/lib/split";

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

describe("parsePercentageToBasisPoints", () => {
  it("parses whole and fractional percentages", () => {
    expect(parsePercentageToBasisPoints("33.34")).toBe(3334);
    expect(parsePercentageToBasisPoints("100")).toBe(10000);
    expect(parsePercentageToBasisPoints("0.5")).toBe(50);
  });

  it("rejects malformed input", () => {
    expect(() => parsePercentageToBasisPoints("abc")).toThrow();
    expect(() => parsePercentageToBasisPoints("-5")).toThrow();
  });

  it("rejects a percentage over 100", () => {
    expect(() => parsePercentageToBasisPoints("100.01")).toThrow();
  });
});

describe("splitByExactAmounts", () => {
  it("passes entries through as shares", () => {
    const shares = splitByExactAmounts([
      { userId: "a", amountCents: 700 },
      { userId: "b", amountCents: 300 },
    ]);
    expect(shares).toEqual([
      { userId: "a", shareCents: 700 },
      { userId: "b", shareCents: 300 },
    ]);
  });
});

describe("splitByPercentages", () => {
  it("distributes remainder cents so shares sum exactly to the total (33.33/33.33/33.34%)", () => {
    const bps = (s: string) => parsePercentageToBasisPoints(s);
    const shares = splitByPercentages(1000, [
      { userId: "a", percentageBps: bps("33.33") },
      { userId: "b", percentageBps: bps("33.33") },
      { userId: "c", percentageBps: bps("33.34") },
    ]);
    // a=333 (rem 3000), b=333 (rem 3000), c=333 (rem 4000, floor 333.4) -> floored sum 999,
    // deficit 1 cent goes to the largest remainder (c).
    expect(shares).toEqual([
      { userId: "a", percentageBps: 3333, shareCents: 333 },
      { userId: "b", percentageBps: 3333, shareCents: 333 },
      { userId: "c", percentageBps: 3334, shareCents: 334 },
    ]);
    const sum = shares.reduce((total, s) => total + s.shareCents, 0);
    expect(sum).toBe(1000);
  });

  it("handles an even percentage split with no remainder", () => {
    const shares = splitByPercentages(10000, [
      { userId: "a", percentageBps: 5000 },
      { userId: "b", percentageBps: 5000 },
    ]);
    expect(shares).toEqual([
      { userId: "a", percentageBps: 5000, shareCents: 5000 },
      { userId: "b", percentageBps: 5000, shareCents: 5000 },
    ]);
  });

  it("always produces shares that sum exactly to the total", () => {
    const cases: [number, number[]][] = [
      [1000, [3333, 3333, 3334]],
      [999, [2000, 3000, 5000]],
      [100, [1111, 1111, 1111, 6667]],
    ];

    for (const [total, bpsList] of cases) {
      const entries = bpsList.map((percentageBps, i) => ({
        userId: `member-${i}`,
        percentageBps,
      }));
      const shares = splitByPercentages(total, entries);
      const sum = shares.reduce((acc, s) => acc + s.shareCents, 0);
      expect(sum).toBe(total);
    }
  });

  it("rejects a non-positive amount", () => {
    expect(() =>
      splitByPercentages(0, [{ userId: "a", percentageBps: 10000 }])
    ).toThrow();
  });
});
