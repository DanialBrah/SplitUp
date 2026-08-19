import { prisma } from "@/lib/prisma";
import { computeNetBalances, computePairwiseDebts, simplifyDebts } from "@/lib/balances";

export async function getGroupBalances(groupId: string) {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      select: {
        id: true,
        payerId: true,
        amountCents: true,
        splits: { select: { userId: true, shareCents: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { groupId },
      select: { fromUserId: true, toUserId: true, amountCents: true },
    }),
  ]);

  const splits = expenses.flatMap((e) =>
    e.splits.map((s) => ({
      expenseId: e.id,
      userId: s.userId,
      shareCents: s.shareCents,
    }))
  );
  const expenseInputs = expenses.map((e) => ({
    id: e.id,
    payerId: e.payerId,
    amountCents: e.amountCents,
  }));

  const netBalances = computeNetBalances(expenseInputs, splits, settlements);

  return {
    netBalances,
    pairwiseDebts: computePairwiseDebts(expenseInputs, splits, settlements),
    settlementSuggestions: simplifyDebts(netBalances),
  };
}
