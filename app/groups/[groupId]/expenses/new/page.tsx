import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { AppError } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { requireGroupMember } from "@/lib/session";

type Props = { params: Promise<{ groupId: string }> };

export default async function NewExpensePage({ params }: Props) {
  const { groupId } = await params;
  await requireGroupMember(groupId);

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const members = group.members.map((m) => ({ id: m.user.id, name: m.user.name }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/groups/${groupId}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to {group.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">
        Add expense to {group.name}
      </h1>
      <div className="mt-6">
        <ExpenseForm mode="create" groupId={group.id} members={members} />
      </div>
    </div>
  );
}
