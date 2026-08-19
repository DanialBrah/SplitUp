import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { GroupNav } from "@/components/GroupNav";
import { SettlementForm } from "@/components/SettlementForm";
import { getGroupBalances } from "@/lib/balances-query";
import { AppError } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { formatCents } from "@/lib/money";
import { requireGroupMember } from "@/lib/session";
import { listSettlementsForGroup } from "@/lib/settlements";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupBalancesPage({ params }: Props) {
  const { groupId } = await params;
  await requireGroupMember(groupId);

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const [{ netBalances, pairwiseDebts }, settlements] = await Promise.all([
    getGroupBalances(groupId),
    listSettlementsForGroup(groupId),
  ]);

  const members = group.members.map((m) => ({ id: m.user.id, name: m.user.name }));
  const nameById = new Map(members.map((m) => [m.id, m.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">{group.name}: Balances</h1>

      <GroupNav groupId={group.id} active="balances" />

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900">Net position</h2>
        <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
          {members.map((m) => {
            const net = netBalances.get(m.id) ?? 0;
            return (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{m.name}</span>
                <span
                  className={
                    net > 0
                      ? "text-green-700"
                      : net < 0
                        ? "text-red-700"
                        : "text-gray-500"
                  }
                >
                  {net === 0
                    ? "settled up"
                    : net > 0
                      ? `is owed ${formatCents(net)}`
                      : `owes ${formatCents(-net)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Who owes whom</h2>
        {pairwiseDebts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Everyone is settled up.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {pairwiseDebts.map((d) => (
              <li
                key={`${d.from}-${d.to}`}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  {nameById.get(d.from)} owes {nameById.get(d.to)}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCents(d.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Record a payment</h2>
        <div className="mt-2 max-w-md">
          <SettlementForm groupId={groupId} members={members} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Settlement history</h2>
        {settlements.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {settlements.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <p>
                    {s.fromUser.name} → {s.toUser.name}
                    {s.note ? ` (${s.note})` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.date.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">
                    {formatCents(s.amountCents)}
                  </span>
                  <DeleteButton
                    url={`/api/groups/${groupId}/settlements/${s.id}`}
                    confirmMessage="Delete this payment record?"
                    redirectTo={`/groups/${groupId}/balances`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
