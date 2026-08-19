import { notFound } from "next/navigation";
import { AddMemberForm } from "@/components/AddMemberForm";
import { GroupNav } from "@/components/GroupNav";
import { MemberRoleButton } from "@/components/MemberRoleButton";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { AppError } from "@/lib/errors";
import { getGroupOrThrow } from "@/lib/groups";
import { requireGroupMember } from "@/lib/session";
import { listUsers } from "@/lib/users";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupMembersPage({ params }: Props) {
  const { groupId } = await params;
  const currentUser = await requireGroupMember(groupId);

  const group = await getGroupOrThrow(groupId).catch((error: unknown) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const members = [...group.members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "ADMIN" ? -1 : 1;
    return a.user.name.localeCompare(b.user.name);
  });

  let candidates: { id: string; name: string; email: string }[] = [];
  if (currentUser.role === "ADMIN") {
    const memberIds = new Set(group.members.map((m) => m.userId));
    const allUsers = await listUsers();
    candidates = allUsers.filter((u) => !memberIds.has(u.id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">{group.name}: Members</h1>

      <GroupNav groupId={group.id} active="members" />

      <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">
                {m.user.name}
                {m.userId === currentUser.id && (
                  <span className="ml-1 font-normal text-gray-500">(you)</span>
                )}
              </p>
              <p className="text-xs text-gray-500">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  m.role === "ADMIN"
                    ? "rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                }
              >
                {m.role === "ADMIN" ? "Admin" : "Member"}
              </span>
              {currentUser.role === "ADMIN" && (
                <>
                  <MemberRoleButton groupId={group.id} userId={m.userId} role={m.role} />
                  <RemoveMemberButton
                    groupId={group.id}
                    userId={m.userId}
                    memberName={m.user.name}
                  />
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {currentUser.role === "ADMIN" && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Add member</h2>
          <AddMemberForm groupId={group.id} candidates={candidates} />
        </div>
      )}
    </div>
  );
}
