import { z } from "zod";
import { ExpenseCategory } from "@/app/generated/prisma/enums";
import { dollarsToCents } from "@/lib/money";
import { parsePercentageToBasisPoints } from "@/lib/split";

const categoryValues = Object.values(ExpenseCategory) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

const amountField = z.string().transform((value, ctx) => {
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
});

const percentageField = z.string().transform((value, ctx) => {
  try {
    return parsePercentageToBasisPoints(value);
  } catch {
    ctx.addIssue({
      input: value,
      code: "custom",
      message: "Percentage must be a number like 33.34",
    });
    return z.NEVER;
  }
});

const baseFields = {
  description: z.string().trim().min(1, "Description is required").max(200),
  amount: amountField,
  payerId: z.string().min(1, "Payer is required"),
  date: z.iso.date("Date must be in YYYY-MM-DD format"),
  category: z.enum(categoryValues).default("OTHER"),
};

const equalExpenseSchema = z.object({
  ...baseFields,
  splitType: z.literal("EQUAL"),
  memberIds: z.array(z.string().min(1)).min(1, "Select at least one member"),
});

const exactExpenseSchema = z.object({
  ...baseFields,
  splitType: z.literal("EXACT"),
  splits: z
    .array(z.object({ userId: z.string().min(1), amount: amountField }))
    .min(1, "Select at least one member"),
});

const percentageExpenseSchema = z.object({
  ...baseFields,
  splitType: z.literal("PERCENTAGE"),
  splits: z
    .array(z.object({ userId: z.string().min(1), percentage: percentageField }))
    .min(1, "Select at least one member"),
});

export const expensePayloadSchema = z.discriminatedUnion("splitType", [
  equalExpenseSchema,
  exactExpenseSchema,
  percentageExpenseSchema,
]);

export type ExpensePayload = z.infer<typeof expensePayloadSchema>;
