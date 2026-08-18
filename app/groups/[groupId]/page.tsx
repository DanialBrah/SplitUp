import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { AppError } from "@/lib/errors";
import { listExpensesForGroup } from "@/lib/expenses";
import { getGroupOrThrow } from "@/lib/groups";
import { formatCents } from "@/lib/money";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const expenses = await listExpensesForGroup(groupId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
          {group.description && (
            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Members: {group.members.map((m) => m.user.name).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/groups/${group.id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <DeleteButton
            url={`/api/groups/${group.id}`}
            confirmMessage={`Delete "${group.name}"? This will also delete all of its expenses.`}
            redirectTo="/groups"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Expenses</h2>
        <Link
          href={`/groups/${group.id}/expenses/new`}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add expense
        </Link>
      </div>

      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No expenses yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link
                href={`/groups/${group.id}/expenses/${expense.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{expense.description}</p>
                  <p className="text-sm text-gray-500">
                    {expense.date.toISOString().slice(0, 10)} · {expense.category} ·
                    paid by {expense.payer.name}
                  </p>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCents(expense.amountCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
