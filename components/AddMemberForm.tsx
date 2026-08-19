"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = { id: string; name: string; email: string };

type AddMemberFormProps = {
  groupId: string;
  candidates: UserOption[];
};

export function AddMemberForm({ groupId, candidates }: AddMemberFormProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? candidates.filter(
        (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      )
    : candidates;

  async function handleAdd(userId: string) {
    setError(null);
    setAddingId(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not add this member");
        return;
      }
      setSearch("");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setAddingId(null);
    }
  }

  if (candidates.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">Everyone is already in this group.</p>;
  }

  return (
    <div className="mt-2 max-w-md">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No users match &quot;{search}&quot;.</p>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <span>
                {user.name} <span className="text-gray-400">({user.email})</span>
              </span>
              <button
                type="button"
                onClick={() => handleAdd(user.id)}
                disabled={addingId === user.id}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {addingId === user.id ? "Adding…" : "Add"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
