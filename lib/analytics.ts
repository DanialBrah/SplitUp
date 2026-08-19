import { prisma } from "@/lib/prisma";
import type { ExpenseCategory } from "@/app/generated/prisma/enums";

export interface CategoryBreakdownEntry {
  category: ExpenseCategory;
  totalCents: number;
  percentageOfGroupTotal: number; // 0-100
}

export async function getCategoryBreakdown(groupId: string) {
  const grouped = await prisma.expense.groupBy({
    by: ["category"],
    where: { groupId },
    _sum: { amountCents: true },
  });

  const grandTotalCents = grouped.reduce(
    (sum, g) => sum + (g._sum.amountCents ?? 0),
    0
  );

  const entries: CategoryBreakdownEntry[] = grouped
    .map((g) => ({
      category: g.category,
      totalCents: g._sum.amountCents ?? 0,
      percentageOfGroupTotal:
        grandTotalCents > 0 ? ((g._sum.amountCents ?? 0) / grandTotalCents) * 100 : 0,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return { entries, grandTotalCents };
}
