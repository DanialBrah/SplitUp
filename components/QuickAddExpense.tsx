"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { createExpenseQuickAdd } from "@/app/groups/[groupId]/actions";
import { ExpenseCategory } from "@/app/generated/prisma/enums";
import { dollarsToCents, formatCents } from "@/lib/money";

export type DisplayExpense = {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  payerId: string;
  payerName: string;
  pending?: boolean;
};

type MemberOption = { id: string; name: string };

type QuickAddExpenseProps = {
  groupId: string;
  members: MemberOption[];
  expenses: DisplayExpense[];
};

const categoryOptions = Object.values(ExpenseCategory);

export function QuickAddExpense({ groupId, members, expenses }: QuickAddExpenseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [optimisticExpenses, addOptimistic] = useOptimistic(
    expenses,
    (state, newExpense: DisplayExpense) => [newExpense, ...state]
  );
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("OTHER");
  const [memberIds, setMemberIds] = useState<string[]>(members.map((m) => m.id));

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let previewCents: number;
    try {
      previewCents = dollarsToCents(amount);
    } catch {
      setError("Amount must be a positive number like 12.50");
      return;
    }
    if (memberIds.length === 0) {
      setError("Select at least one member");
      return;
    }

    const payer = members.find((m) => m.id === payerId);
    const tempExpense: DisplayExpense = {
      id: `temp-${Date.now()}`,
      description,
      amountCents: previewCents,
      date,
      category,
      payerId,
      payerName: payer?.name ?? "",
      pending: true,
    };
    const input = { description, amount, payerId, date, category, memberIds };

    startTransition(async () => {
      addOptimistic(tempExpense);
      const result = await createExpenseQuickAdd(groupId, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setDescription("");
      setAmount("");
      // Clear any active filters/page so the new expense is guaranteed visible.
      router.push(pathname);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          {showForm ? "Cancel" : "+ Quick add expense"}
        </button>
        <Link
          href={`/groups/${groupId}/expenses/new`}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Need an uneven split? Use the full form →
        </Link>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 rounded-md border border-gray-200 p-4"
        >
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={memberIds.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Add expense (equal split)"}
          </button>
        </form>
      )}

      {optimisticExpenses.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No expenses match these filters.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {optimisticExpenses.map((expense) =>
            expense.pending ? (
              <li key={expense.id} className="opacity-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-500">
                      {expense.date} · {expense.category} · paid by {expense.payerName} ·
                      Saving…
                    </p>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCents(expense.amountCents)}
                  </span>
                </div>
              </li>
            ) : (
              <li key={expense.id}>
                <Link
                  href={`/groups/${groupId}/expenses/${expense.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-500">
                      {expense.date} · {expense.category} · paid by {expense.payerName}
                    </p>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatCents(expense.amountCents)}
                  </span>
                </Link>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
