"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MemberRoleButtonProps = {
  groupId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
};

export function MemberRoleButton({ groupId, userId, role }: MemberRoleButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextRole = role === "ADMIN" ? "MEMBER" : "ADMIN";
  const label = role === "ADMIN" ? "Demote to member" : "Promote to admin";

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update this member's role");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {submitting ? "Saving…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
