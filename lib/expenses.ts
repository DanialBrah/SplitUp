import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { splitEqually } from "@/lib/split";
import type { ExpensePayload } from "@/lib/validation/expense-payload";
import {
  assertNoDuplicateSplitMembers,
  assertPayerIsMember,
  assertPositiveAmount,
  assertSplitMembersAreGroupMembers,
  assertSplitSumsToTotal,
} from "@/lib/validation/expense-rules";

const expenseInclude = {
  payer: true,
  splits: { include: { user: true } },
} as const;

export function listExpensesForGroup(groupId: string) {
  return prisma.expense.findMany({
    where: { groupId },
    orderBy: { date: "desc" },
    include: expenseInclude,
  });
}

export async function getExpenseOrThrow(groupId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
    include: expenseInclude,
  });
  if (!expense) throw notFound("Expense");
  return expense;
}

async function buildValidatedSplits(groupId: string, payload: ExpensePayload) {
  const group = await getGroupOrThrow(groupId);
  const memberIds = group.members.map((m) => m.userId);

  assertPositiveAmount(payload.amount);
  assertPayerIsMember(payload.payerId, memberIds);

  const splits = splitEqually(payload.amount, payload.memberIds);

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
      splits: {
        create: splits.map((s) => ({ userId: s.userId, shareCents: s.shareCents })),
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
        splits: {
          create: splits.map((s) => ({ userId: s.userId, shareCents: s.shareCents })),
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
