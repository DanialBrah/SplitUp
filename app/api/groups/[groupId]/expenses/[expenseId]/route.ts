import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { deleteExpense, getExpenseOrThrow, updateExpense } from "@/lib/expenses";
import { expensePayloadSchema } from "@/lib/validation/expense-payload";

type Context = { params: Promise<{ groupId: string; expenseId: string }> };

export const GET = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId, expenseId } = await params;
  const expense = await getExpenseOrThrow(groupId, expenseId);
  return NextResponse.json(expense);
});

export const PUT = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId, expenseId } = await params;
  const body = await req.json();
  const payload = expensePayloadSchema.parse(body);
  const expense = await updateExpense(groupId, expenseId, payload);
  return NextResponse.json(expense);
});

export const DELETE = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId, expenseId } = await params;
  await deleteExpense(groupId, expenseId);
  return new NextResponse(null, { status: 204 });
});
