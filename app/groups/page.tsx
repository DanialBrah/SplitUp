import Link from "next/link";
import { listGroups } from "@/lib/groups";
import { requireUser } from "@/lib/session";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await listGroups(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
        <Link
          href="/groups/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          New group
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">
          No groups yet. Create one to start tracking shared expenses.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-gray-500">{group.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400">
                  {group.members.length} member{group.members.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
