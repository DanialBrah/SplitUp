"use client";

import { dollarsToCents, formatCents } from "@/lib/money";
import {
  parsePercentageToBasisPoints,
  splitByExactAmounts,
  splitByPercentages,
  splitEqually,
} from "@/lib/split";

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE";

export type SplitEntry = {
  userId: string;
  included: boolean;
  amount: string;
  percentage: string;
};

type MemberOption = { id: string; name: string };

type SplitEditorProps = {
  members: MemberOption[];
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  entries: SplitEntry[];
  onEntriesChange: (entries: SplitEntry[]) => void;
  amount: string;
};

const splitTypeLabels: Record<SplitType, string> = {
  EQUAL: "Equally",
  EXACT: "Exact amounts",
  PERCENTAGE: "Percentage",
};

export function SplitEditor({
  members,
  splitType,
  onSplitTypeChange,
  entries,
  onEntriesChange,
  amount,
}: SplitEditorProps) {
  function updateEntry(userId: string, patch: Partial<SplitEntry>) {
    onEntriesChange(entries.map((e) => (e.userId === userId ? { ...e, ...patch } : e)));
  }

  const included = entries.filter((e) => e.included);

  let preview: { userId: string; shareCents: number }[] | null = null;
  let totalCents = 0;
  try {
    totalCents = dollarsToCents(amount);

    if (splitType === "EQUAL") {
      preview = splitEqually(
        totalCents,
        included.map((e) => e.userId)
      );
    } else if (splitType === "EXACT") {
      preview = splitByExactAmounts(
        included.map((e) => ({ userId: e.userId, amountCents: dollarsToCents(e.amount) }))
      );
    } else {
      preview = splitByPercentages(
        totalCents,
        included.map((e) => ({
          userId: e.userId,
          percentageBps: parsePercentageToBasisPoints(e.percentage),
        }))
      );
    }
  } catch {
    preview = null;
  }

  const previewSum = preview?.reduce((sum, s) => sum + s.shareCents, 0) ?? 0;
  const previewMismatch = preview !== null && previewSum !== totalCents;

  const percentageTotal = included.reduce((sum, e) => {
    const value = Number(e.percentage);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const percentageRemaining = Math.round((100 - percentageTotal) * 100) / 100;

  let remainingMessage = `${percentageRemaining}% remaining`;
  let remainingClassName = "mt-2 text-xs text-gray-500";
  if (percentageRemaining === 0) {
    remainingMessage = "100% allocated";
    remainingClassName = "mt-2 text-xs text-green-700";
  } else if (percentageRemaining < 0) {
    remainingMessage = `${Math.abs(percentageRemaining)}% over 100%`;
    remainingClassName = "mt-2 text-xs text-red-600";
  }

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700">Split</span>
      <div className="mt-2 flex gap-4 text-sm">
        {(Object.keys(splitTypeLabels) as SplitType[]).map((type) => (
          <label key={type} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="splitType"
              checked={splitType === type}
              onChange={() => onSplitTypeChange(type)}
            />
            {splitTypeLabels[type]}
          </label>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {entries.map((entry) => {
          const member = members.find((m) => m.id === entry.userId);
          if (!member) return null;
          return (
            <div key={entry.userId} className="flex items-center gap-3">
              <label className="flex w-32 shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entry.included}
                  onChange={(e) =>
                    updateEntry(entry.userId, { included: e.target.checked })
                  }
                />
                {member.name}
              </label>

              {entry.included && splitType === "EXACT" && (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={entry.amount}
                  onChange={(e) => updateEntry(entry.userId, { amount: e.target.value })}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              )}

              {entry.included && splitType === "PERCENTAGE" && (
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={entry.percentage}
                  onChange={(e) =>
                    updateEntry(entry.userId, { percentage: e.target.value })
                  }
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              )}
            </div>
          );
        })}
      </div>

      {splitType === "PERCENTAGE" && (
        <p className={remainingClassName}>{remainingMessage}</p>
      )}

      {preview && (
        <div className="mt-3 rounded-md bg-gray-50 px-4 py-3 text-sm">
          <ul className="space-y-1">
            {preview.map((s) => (
              <li key={s.userId} className="flex justify-between">
                <span>{members.find((m) => m.id === s.userId)?.name}</span>
                <span>{formatCents(s.shareCents)}</span>
              </li>
            ))}
          </ul>
          {previewMismatch && (
            <p className="mt-2 text-xs text-red-600">
              Splits total {formatCents(previewSum)}, which doesn&apos;t match the
              expense amount.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
