import { z } from "zod";
import { ExpenseCategory } from "@/app/generated/prisma/enums";
import { dollarsToCents } from "@/lib/money";

const categoryValues = Object.values(ExpenseCategory) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

export const expensePayloadSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(200),
  amount: z.string().transform((value, ctx) => {
    try {
      return dollarsToCents(value);
    } catch {
      ctx.addIssue({
        input: value,
        code: "custom",
        message: "Amount must be a positive number like 12.50",
      });
      return z.NEVER;
    }
  }),
  payerId: z.string().min(1, "Payer is required"),
  date: z.iso.date("Date must be in YYYY-MM-DD format"),
  category: z.enum(categoryValues).default("OTHER"),
  memberIds: z.array(z.string().min(1)).min(1, "Select at least one member"),
});

export type ExpensePayload = z.infer<typeof expensePayloadSchema>;
