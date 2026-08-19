import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { GroupNav } from "@/components/GroupNav";
import { QuickAddExpense, type DisplayExpense } from "@/components/QuickAddExpense";
import { AppError } from "@/lib/errors";
import { listExpensesForGroup } from "@/lib/expenses";
import { getGroupOrThrow } from "@/lib/groups";
import { requireGroupMember } from "@/lib/session";
import { parseExpenseQuery } from "@/lib/validation/expense-query";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GroupDetailPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const member = await requireGroupMember(groupId);

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const rawQuery = await searchParams;
  const query = parseExpenseQuery(rawQuery);
  const { expenses, total, page, totalPages } = await listExpensesForGroup(
    groupId,
    query
  );

  const members = group.members.map((m) => ({ id: m.user.id, name: m.user.name }));

  // Prisma's Decimal (ExpenseSplit.percentage) can't cross the Server->Client
  // prop boundary, so map to a flat, plain-object shape before handing this
  // off to the client component below.
  const displayExpenses: DisplayExpense[] = expenses.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amountCents: expense.amountCents,
    date: expense.date.toISOString().slice(0, 10),
    category: expense.category,
    payerId: expense.payerId,
    payerName: expense.payer.name,
  }));

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(
      Object.entries(rawQuery).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]]
      ) as [string, string][]
    );
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-700">
        ← All groups
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
          {group.description && (
            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Members: {group.members.map((m) => m.user.name).join(", ")}
          </p>
        </div>
        {member.role === "ADMIN" && (
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
        )}
      </div>

      <GroupNav groupId={group.id} active="expenses" />

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Expenses</h2>
      </div>

      <ExpenseFilters members={members} />

      <div className="mt-4">
        <QuickAddExpense groupId={group.id} members={members} expenses={displayExpenses} />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
