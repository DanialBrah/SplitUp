"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExpenseCategory } from "@/app/generated/prisma/enums";
import { SplitEditor, type SplitEntry, type SplitType } from "@/components/SplitEditor";

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
    splitType: string;
    splits: { userId: string; shareCents: number; percentage: string | null }[];
  };
};

const categoryOptions = Object.values(ExpenseCategory);

function buildInitialEntries(
  members: MemberOption[],
  expense: ExpenseFormProps["expense"]
): SplitEntry[] {
  return members.map((m) => {
    const existing = expense?.splits.find((s) => s.userId === m.id);
    return {
      userId: m.id,
      included: expense ? Boolean(existing) : true,
      amount: existing ? (existing.shareCents / 100).toFixed(2) : "",
      percentage: existing?.percentage ?? "",
    };
  });
}

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
  const [splitType, setSplitType] = useState<SplitType>(
    (expense?.splitType as SplitType) ?? "EQUAL"
  );
  const [entries, setEntries] = useState<SplitEntry[]>(
    buildInitialEntries(members, expense)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const url =
      mode === "create"
        ? `/api/groups/${groupId}/expenses`
        : `/api/groups/${groupId}/expenses/${expense!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const included = entries.filter((e) => e.included);
    const base = { description, amount, payerId, date, category, splitType };

    let body: object;
    if (splitType === "EQUAL") {
      body = { ...base, memberIds: included.map((e) => e.userId) };
    } else if (splitType === "EXACT") {
      body = {
        ...base,
        splits: included.map((e) => ({ userId: e.userId, amount: e.amount })),
      };
    } else {
      body = {
        ...base,
        splits: included.map((e) => ({ userId: e.userId, percentage: e.percentage })),
      };
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      <SplitEditor
        members={members}
        splitType={splitType}
        onSplitTypeChange={setSplitType}
        entries={entries}
        onEntriesChange={setEntries}
        amount={amount}
      />

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
