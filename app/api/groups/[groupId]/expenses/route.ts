import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { createExpense, listExpensesForGroup } from "@/lib/expenses";
import { expensePayloadSchema } from "@/lib/validation/expense-payload";

type Context = { params: Promise<{ groupId: string }> };

export const GET = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId } = await params;
  const expenses = await listExpensesForGroup(groupId);
  return NextResponse.json(expenses);
});

export const POST = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId } = await params;
  const body = await req.json();
  const payload = expensePayloadSchema.parse(body);
  const expense = await createExpense(groupId, payload);
  return NextResponse.json(expense, { status: 201 });
});
