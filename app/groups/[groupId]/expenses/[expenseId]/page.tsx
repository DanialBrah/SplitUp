import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { AppError } from "@/lib/errors";
import { getExpenseOrThrow } from "@/lib/expenses";
import { getGroupOrThrow } from "@/lib/groups";

type Props = { params: Promise<{ groupId: string; expenseId: string }> };

export default async function ExpenseDetailPage({ params }: Props) {
  const { groupId, expenseId } = await params;

  const [group, expense] = await Promise.all([
    getGroupOrThrow(groupId),
    getExpenseOrThrow(groupId, expenseId),
  ]).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const members = group.members.map((m) => ({ id: m.user.id, name: m.user.name }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{expense.description}</h1>
        <DeleteButton
          url={`/api/groups/${groupId}/expenses/${expenseId}`}
          confirmMessage={`Delete "${expense.description}"?`}
          redirectTo={`/groups/${groupId}`}
        />
      </div>
      <div className="mt-6">
        <ExpenseForm
          mode="edit"
          groupId={groupId}
          members={members}
          expense={{
            id: expense.id,
            description: expense.description,
            amountCents: expense.amountCents,
            payerId: expense.payerId,
            date: expense.date.toISOString().slice(0, 10),
            category: expense.category,
            splits: expense.splits.map((s) => ({ userId: s.userId })),
          }}
        />
      </div>
    </div>
  );
}
