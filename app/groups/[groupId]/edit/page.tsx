import { notFound } from "next/navigation";
import { GroupForm } from "@/components/GroupForm";
import { AppError } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { listUsers } from "@/lib/users";

type Props = { params: Promise<{ groupId: string }> };

export default async function EditGroupPage({ params }: Props) {
  const { groupId } = await params;

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const users = await listUsers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Edit {group.name}</h1>
      <div className="mt-6">
        <GroupForm mode="edit" users={users} group={group} />
      </div>
    </div>
  );
}
