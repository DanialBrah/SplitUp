import { notFound } from "next/navigation";
import { GroupNav } from "@/components/GroupNav";
import { getCategoryBreakdown } from "@/lib/analytics";
import { AppError } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { formatCents } from "@/lib/money";
import { requireGroupMember } from "@/lib/session";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupInsightsPage({ params }: Props) {
  const { groupId } = await params;
  await requireGroupMember(groupId);

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const { entries, grandTotalCents } = await getCategoryBreakdown(groupId);
  const maxCents = entries.length > 0 ? entries[0].totalCents : 0;

  let body: React.ReactNode;
  if (entries.length === 0) {
    body = <p className="mt-6 text-sm text-gray-500">No expenses yet.</p>;
  } else if (entries.length === 1) {
    body = (
      <p className="mt-6 text-sm text-gray-700">
        All spending so far is{" "}
        <span className="font-medium">{entries[0].category}</span> —{" "}
        {formatCents(entries[0].totalCents)}. A breakdown needs at least two categories
        to compare.
      </p>
    );
  } else {
    body = (
      <div className="mt-6 space-y-4">
        {entries.map((entry) => {
          const widthPercent = maxCents > 0 ? (entry.totalCents / maxCents) * 100 : 0;
          const tooltip = `${entry.category}: ${formatCents(entry.totalCents)} (${entry.percentageOfGroupTotal.toFixed(1)}%)`;
          return (
            <div key={entry.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-gray-900">{entry.category}</span>
                <span className="text-gray-900">
                  {formatCents(entry.totalCents)}{" "}
                  <span className="text-gray-500">
                    ({entry.percentageOfGroupTotal.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="mt-1 h-5 rounded-r bg-gray-100" title={tooltip}>
                <div
                  className="h-5 rounded-r bg-[#2a78d6]"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">
        {group.name}: Spending by category
      </h1>

      <GroupNav groupId={group.id} active="insights" />

      {body}

      <p className="mt-6 text-sm text-gray-500">Total: {formatCents(grandTotalCents)}</p>
    </div>
  );
}
