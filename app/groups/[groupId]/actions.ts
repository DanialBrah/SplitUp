"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { createExpense } from "@/lib/expenses";
import { requireGroupMember } from "@/lib/session";
import { expensePayloadSchema } from "@/lib/validation/expense-payload";

export type QuickAddInput = {
  description: string;
  amount: string;
  payerId: string;
  date: string;
  category: string;
  memberIds: string[];
};

export async function createExpenseQuickAdd(
  groupId: string,
  input: QuickAddInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Re-checked here even though the page that renders the quick-add form
    // already gates on membership — render-time gating is not a security
    // boundary for a Server Action, which is reachable directly by anyone
    // who can POST to it.
    await requireGroupMember(groupId);

    const payload = expensePayloadSchema.parse({ ...input, splitType: "EQUAL" });
    await createExpense(groupId, payload);
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
    }
    console.error(error);
    return { ok: false, error: "Something went wrong" };
  }
}
