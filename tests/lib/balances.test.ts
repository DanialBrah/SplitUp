import { describe, expect, it } from "vitest";
import { computeNetBalances, computePairwiseDebts } from "@/lib/balances";

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
