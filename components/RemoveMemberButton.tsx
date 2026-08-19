"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RemoveMemberButtonProps = {
  groupId: string;
  userId: string;
  memberName: string;
};

export function RemoveMemberButton({ groupId, userId, memberName }: RemoveMemberButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleClick() {
    if (!confirm(`Remove ${memberName} from this group?`)) return;
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not remove this member");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={removing}
        className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {removing ? "Removing…" : "Remove"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
