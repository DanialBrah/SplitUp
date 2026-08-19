"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { centsToDollars } from "@/lib/money";

type SettleSuggestionButtonProps = {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

export function SettleSuggestionButton({
  groupId,
  fromUserId,
  toUserId,
  amountCents,
}: SettleSuggestionButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId,
          toUserId,
          amount: centsToDollars(amountCents),
          date: new Date().toISOString().slice(0, 10),
          note: "Debt simplification suggestion",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not record this payment");
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
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {submitting ? "Recording…" : "Mark as settled"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
