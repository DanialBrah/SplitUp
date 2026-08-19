"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExpenseCategory } from "@/app/generated/prisma/enums";

type MemberOption = { id: string; name: string };

type ExpenseFiltersProps = {
  members: MemberOption[];
};

const categoryOptions = Object.values(ExpenseCategory);

export function ExpenseFilters({ members }: ExpenseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500">Category</label>
        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => updateParam("category", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Paid by</label>
        <select
          value={searchParams.get("payerId") ?? ""}
          onChange={(e) => updateParam("payerId", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">From</label>
        <input
          type="date"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">To</label>
        <input
          type="date"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Sort by</label>
        <select
          value={searchParams.get("sortBy") ?? "date"}
          onChange={(e) => updateParam("sortBy", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="date">Date</option>
          <option value="amount">Amount</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500">Order</label>
        <select
          value={searchParams.get("sortDir") ?? "desc"}
          onChange={(e) => updateParam("sortDir", e.target.value)}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="desc">Newest / highest first</option>
          <option value="asc">Oldest / lowest first</option>
        </select>
      </div>
    </div>
  );
}
