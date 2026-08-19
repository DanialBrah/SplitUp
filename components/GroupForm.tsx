"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type UserOption = { id: string; name: string; email: string };

type GroupFormProps = {
  mode: "create" | "edit";
  users: UserOption[];
  group?: {
    id: string;
    name: string;
    description: string | null;
    members: { userId: string }[];
  };
};

export function GroupForm({ mode, users, group }: GroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(
    group?.members.map((m) => m.userId) ?? []
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = memberSearch.trim().toLowerCase();
  const filteredUsers = query
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      )
    : users;
  const selectedUsers = users.filter((u) => memberIds.includes(u.id));

  function toggleMember(userId: string) {
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const url = mode === "create" ? "/api/groups" : `/api/groups/${group!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, memberIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      router.push(`/groups/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Group name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Members</span>
        {selectedUsers.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Selected: {selectedUsers.map((u) => u.name).join(", ")}
          </p>
        )}
        <input
          type="text"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users match &quot;{memberSearch}&quot;.</p>
          ) : (
            filteredUsers.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={memberIds.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                />
                {user.name} <span className="text-gray-400">({user.email})</span>
              </label>
            ))
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving…" : mode === "create" ? "Create group" : "Save changes"}
      </button>
    </form>
  );
}
