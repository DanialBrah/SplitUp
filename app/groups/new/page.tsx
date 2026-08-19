import { GroupForm } from "@/components/GroupForm";
import { requireUser } from "@/lib/session";
import { listUsers } from "@/lib/users";

export default async function NewGroupPage() {
  const user = await requireUser();
  const users = await listUsers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">New group</h1>
      <div className="mt-6">
        <GroupForm mode="create" users={users} currentUserId={user.id} />
      </div>
    </div>
  );
}
