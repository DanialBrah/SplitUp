import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { createExpense, listExpensesForGroup } from "@/lib/expenses";
import { requireGroupMember } from "@/lib/session";
import { expensePayloadSchema } from "@/lib/validation/expense-payload";
import { parseExpenseQuery } from "@/lib/validation/expense-query";

type Context = { params: Promise<{ groupId: string }> };

export const GET = withErrorHandling<Context>(async (req: NextRequest, { params }) => {
  const { groupId } = await params;
  await requireGroupMember(groupId);
  const query = parseExpenseQuery(Object.fromEntries(req.nextUrl.searchParams));
  const result = await listExpensesForGroup(groupId, query);
  return NextResponse.json(result);
});

export const POST = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId } = await params;
  await requireGroupMember(groupId);
  const body = await req.json();
  const payload = expensePayloadSchema.parse(body);
  const expense = await createExpense(groupId, payload);
  return NextResponse.json(expense, { status: 201 });
});
