import { describe, expect, it } from "vitest";
import { computeNetBalances, computePairwiseDebts, simplifyDebts } from "@/lib/balances";

// Shared fixture: Alice pays $20.00 for an expense split only between Bob
// ($10) and Carol ($10) - Alice is payer only, not a split participant.
const expenses = [{ id: "exp-1", payerId: "alice", amountCents: 2000 }];
const splits = [
  { expenseId: "exp-1", userId: "bob", shareCents: 1000 },
  { expenseId: "exp-1", userId: "carol", shareCents: 1000 },
];

describe("computeNetBalances", () => {
  it("computes paid-vs-owed before any settlement", () => {
    const net = computeNetBalances(expenses, splits, []);
    expect(net.get("alice")).toBe(2000);
    expect(net.get("bob")).toBe(-1000);
    expect(net.get("carol")).toBe(-1000);
  });

  it("the sum of all nets is always exactly 0 (conservation invariant)", () => {
    const net = computeNetBalances(expenses, splits, []);
    const sum = [...net.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it("only reduces the settling members' balances, not everyone's - Carol still owed after Bob settles", () => {
    const settlements = [{ fromUserId: "bob", toUserId: "alice", amountCents: 1000 }];
    const net = computeNetBalances(expenses, splits, settlements);

    expect(net.get("bob")).toBe(0);
    expect(net.get("alice")).toBe(1000); // NOT 0 - Carol still owes her
    expect(net.get("carol")).toBe(-1000);

    const sum = [...net.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

describe("computePairwiseDebts", () => {
  it("shows both members owing the payer before any settlement", () => {
    const debts = computePairwiseDebts(expenses, splits, []);
    expect(debts).toEqual(
      expect.arrayContaining([
        { from: "bob", to: "alice", amountCents: 1000 },
        { from: "carol", to: "alice", amountCents: 1000 },
      ])
    );
    expect(debts).toHaveLength(2);
  });

  it("drops the settled pair but leaves the other one - only Carol owes Alice after Bob settles", () => {
    const settlements = [{ fromUserId: "bob", toUserId: "alice", amountCents: 1000 }];
    const debts = computePairwiseDebts(expenses, splits, settlements);

    expect(debts).toEqual([{ from: "carol", to: "alice", amountCents: 1000 }]);
  });

  it("reconciles with computeNetBalances for any fixture (cross-check)", () => {
    const settlements = [{ fromUserId: "bob", toUserId: "alice", amountCents: 1000 }];
    const net = computeNetBalances(expenses, splits, settlements);
    const debts = computePairwiseDebts(expenses, splits, settlements);

    // Rebuild net balances purely from the pairwise debts and compare.
    const rebuilt = new Map<string, number>();
    for (const d of debts) {
      rebuilt.set(d.from, (rebuilt.get(d.from) ?? 0) - d.amountCents);
      rebuilt.set(d.to, (rebuilt.get(d.to) ?? 0) + d.amountCents);
    }

    for (const [userId, value] of net) {
      if (value === 0) continue;
      expect(rebuilt.get(userId)).toBe(value);
    }
  });
});

/** Applies every suggestion onto a fresh copy of `balances` and returns the result. */
function applySuggestions(
  balances: Map<string, number>,
  suggestions: { from: string; to: string; amountCents: number }[]
): Map<string, number> {
  const result = new Map(balances);
  for (const s of suggestions) {
    result.set(s.from, (result.get(s.from) ?? 0) + s.amountCents);
    result.set(s.to, (result.get(s.to) ?? 0) - s.amountCents);
  }
  return result;
}

describe("simplifyDebts", () => {
  it("returns nothing when everyone is already settled", () => {
    expect(simplifyDebts(new Map())).toEqual([]);
    expect(simplifyDebts(new Map([["alice", 0], ["bob", 0]]))).toEqual([]);
  });

  it("settles a simple pair in one transaction", () => {
    const suggestions = simplifyDebts(new Map([["alice", 1000], ["bob", -1000]]));
    expect(suggestions).toEqual([{ from: "bob", to: "alice", amountCents: 1000 }]);
  });

  it("produces the exact hand-verified sequence for a 4-person fixture", () => {
    const suggestions = simplifyDebts(
      new Map([
        ["a", 1000],
        ["b", 500],
        ["c", -300],
        ["d", -1200],
      ])
    );
    expect(suggestions).toEqual([
      { from: "d", to: "a", amountCents: 1000 },
      { from: "c", to: "b", amountCents: 300 },
      { from: "d", to: "b", amountCents: 200 },
    ]);
  });

  it("documents the known non-minimal case (greedy isn't the true minimum)", () => {
    // Optimum is 3 transactions ({a,b} and {c,d,e} are each independently
    // zero-sum: b->a:300, e->c:200, e->d:200) but the greedy heuristic
    // doesn't search for that partition, so it takes 4. This is expected
    // greedy behavior, not a regression - see simplifyDebts' docstring.
    const balances = new Map([
      ["a", 300],
      ["b", -300],
      ["c", 200],
      ["d", 200],
      ["e", -400],
    ]);
    const suggestions = simplifyDebts(balances);
    expect(suggestions).toEqual([
      { from: "e", to: "a", amountCents: 300 },
      { from: "b", to: "c", amountCents: 200 },
      { from: "e", to: "d", amountCents: 100 },
      { from: "b", to: "d", amountCents: 100 },
    ]);
    expect(applySuggestions(balances, suggestions)).toEqual(
      new Map([["a", 0], ["b", 0], ["c", 0], ["d", 0], ["e", 0]])
    );
  });

  it("always produces a valid settlement that zeroes every balance (property check)", () => {
    const fixtures: Map<string, number>[] = [
      new Map([["a", 500], ["b", -500]]),
      new Map([["a", 1000], ["b", 500], ["c", -300], ["d", -1200]]),
      new Map([["a", 700], ["b", 300], ["c", -200], ["d", -300], ["e", -500]]),
      new Map([["a", 100], ["b", 100], ["c", 100], ["d", -150], ["e", -150]]),
    ];

    for (const balances of fixtures) {
      const nonZeroCount = [...balances.values()].filter((v) => v !== 0).length;
      const suggestions = simplifyDebts(balances);

      expect(suggestions.length).toBeLessThanOrEqual(Math.max(0, nonZeroCount - 1));
      for (const [, value] of applySuggestions(balances, suggestions)) {
        expect(value).toBe(0);
      }
    }
  });

  it("resolves ties (equal creditors) into a still-valid settlement", () => {
    const balances = new Map([
      ["alice", 500],
      ["bob", 500],
      ["carol", -1000],
    ]);
    const suggestions = simplifyDebts(balances);

    expect(suggestions.length).toBeLessThanOrEqual(2);
    for (const [, value] of applySuggestions(balances, suggestions)) {
      expect(value).toBe(0);
    }
  });
});
