"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExpenseCategory } from "@/app/generated/prisma/enums";
import { dollarsToCents, formatCents } from "@/lib/money";
import { splitEqually } from "@/lib/split";

type MemberOption = { id: string; name: string };

type ExpenseFormProps = {
  mode: "create" | "edit";
  groupId: string;
  members: MemberOption[];
  expense?: {
    id: string;
    description: string;
    amountCents: number;
    payerId: string;
    date: string; // "YYYY-MM-DD"
    category: string;
    splits: { userId: string }[];
  };
};

const categoryOptions = Object.values(ExpenseCategory);

export function ExpenseForm({ mode, groupId, members, expense }: ExpenseFormProps) {
  const router = useRouter();
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(
    expense ? (expense.amountCents / 100).toFixed(2) : ""
  );
  const [payerId, setPayerId] = useState(expense?.payerId ?? members[0]?.id ?? "");
  const [date, setDate] = useState(
    expense?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [category, setCategory] = useState(expense?.category ?? "OTHER");
  const [memberIds, setMemberIds] = useState<string[]>(
    expense ? expense.splits.map((s) => s.userId) : members.map((m) => m.id)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleMember(userId: string) {
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  const preview = useMemo(() => {
    if (memberIds.length === 0) return null;
    try {
      const cents = dollarsToCents(amount);
      return splitEqually(cents, memberIds);
    } catch {
      return null;
    }
  }, [amount, memberIds]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const url =
      mode === "create"
        ? `/api/groups/${groupId}/expenses`
        : `/api/groups/${groupId}/expenses/${expense!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount, payerId, date, category, memberIds }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      router.push(`/groups/${groupId}`);
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount ($)
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="payerId" className="block text-sm font-medium text-gray-700">
            Paid by
          </label>
          <select
            id="payerId"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">
          Split equally among
        </span>
        <div className="mt-2 space-y-2">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={memberIds.includes(m.id)}
                onChange={() => toggleMember(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>

        {preview && (
          <ul className="mt-3 space-y-1 rounded-md bg-gray-50 px-4 py-3 text-sm">
            {preview.map((s) => (
              <li key={s.userId} className="flex justify-between">
                <span>{members.find((m) => m.id === s.userId)?.name}</span>
                <span>{formatCents(s.shareCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving…" : mode === "create" ? "Add expense" : "Save changes"}
      </button>
    </form>
  );
}
