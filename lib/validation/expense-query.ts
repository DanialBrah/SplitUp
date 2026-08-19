import { z } from "zod";
import { ExpenseCategory } from "@/app/generated/prisma/enums";

const categoryValues = Object.values(ExpenseCategory) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export const expenseQuerySchema = z.object({
  category: z.enum(categoryValues).optional(),
  payerId: z.string().min(1).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  sortBy: z.enum(["date", "amount"]).default("date"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

type RawQuery = Record<string, string | string[] | undefined>;

/**
 * Normalizes both URLSearchParams-derived objects (API routes) and Next's
 * searchParams page prop (string | string[] | undefined) into the same shape,
 * stripping empty strings (e.g. an unselected <select>) before validation.
 */
export function parseExpenseQuery(raw: RawQuery): ExpenseQuery {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== "") cleaned[key] = v;
  }
  return expenseQuerySchema.parse(cleaned);
}
