import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { splitByExactAmounts, splitByPercentages, splitEqually } from "@/lib/split";
import type { Share } from "@/lib/split";
import type { ExpensePayload } from "@/lib/validation/expense-payload";
import type { ExpenseQuery } from "@/lib/validation/expense-query";
import {
  assertNoDuplicateSplitMembers,
  assertPayerIsMember,
  assertPercentagesSumTo100,
  assertPositiveAmount,
  assertSplitMembersAreGroupMembers,
  assertSplitSumsToTotal,
} from "@/lib/validation/expense-rules";

const expenseInclude = {
  payer: { select: { id: true, name: true, email: true } },
  splits: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function listExpensesForGroup(groupId: string, query: ExpenseQuery) {
  const where = {
    groupId,
    ...(query.category ? { category: query.category } : {}),
    ...(query.payerId ? { payerId: query.payerId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
  };

  const orderBy =
    query.sortBy === "amount"
      ? { amountCents: query.sortDir }
      : { date: query.sortDir };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: expenseInclude,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getExpenseOrThrow(groupId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
    include: expenseInclude,
  });
  if (!expense) throw notFound("Expense");
  return expense;
}

function computeSplits(payload: ExpensePayload): (Share & { percentage?: string })[] {
  switch (payload.splitType) {
    case "EQUAL":
      return splitEqually(payload.amount, payload.memberIds);
    case "EXACT":
      return splitByExactAmounts(
        payload.splits.map((s) => ({ userId: s.userId, amountCents: s.amount }))
      );
    case "PERCENTAGE": {
      assertPercentagesSumTo100(payload.splits.map((s) => s.percentage));
      const shares = splitByPercentages(
        payload.amount,
        payload.splits.map((s) => ({ userId: s.userId, percentageBps: s.percentage }))
      );
      return shares.map((s) => ({
        userId: s.userId,
        shareCents: s.shareCents,
        percentage: (s.percentageBps / 100).toFixed(2),
      }));
    }
  }
}

async function buildValidatedSplits(groupId: string, payload: ExpensePayload) {
  const group = await getGroupOrThrow(groupId);
  const memberIds = group.members.map((m) => m.userId);

  assertPositiveAmount(payload.amount);
  assertPayerIsMember(payload.payerId, memberIds);

  const splits = computeSplits(payload);

  assertNoDuplicateSplitMembers(splits);
  assertSplitMembersAreGroupMembers(splits, memberIds);
  assertSplitSumsToTotal(splits, payload.amount);

  return splits;
}

export async function createExpense(groupId: string, payload: ExpensePayload) {
  const splits = await buildValidatedSplits(groupId, payload);

  return prisma.expense.create({
    data: {
      groupId,
      description: payload.description,
      amountCents: payload.amount,
      payerId: payload.payerId,
      date: new Date(payload.date),
      category: payload.category,
      splitType: payload.splitType,
      splits: {
        create: splits.map((s) => ({
          userId: s.userId,
          shareCents: s.shareCents,
          percentage: s.percentage,
        })),
      },
    },
    include: expenseInclude,
  });
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  payload: ExpensePayload
) {
  await getExpenseOrThrow(groupId, expenseId);
  const splits = await buildValidatedSplits(groupId, payload);

  return prisma.$transaction(async (tx) => {
    await tx.expenseSplit.deleteMany({ where: { expenseId } });
    return tx.expense.update({
      where: { id: expenseId },
      data: {
        description: payload.description,
        amountCents: payload.amount,
        payerId: payload.payerId,
        date: new Date(payload.date),
        category: payload.category,
        splitType: payload.splitType,
        splits: {
          create: splits.map((s) => ({
            userId: s.userId,
            shareCents: s.shareCents,
            percentage: s.percentage,
          })),
        },
      },
      include: expenseInclude,
    });
  });
}

export async function deleteExpense(groupId: string, expenseId: string) {
  await getExpenseOrThrow(groupId, expenseId);
  await prisma.expense.delete({ where: { id: expenseId } });
}
