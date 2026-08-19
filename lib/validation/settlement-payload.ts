import { z } from "zod";
import { dollarsToCents } from "@/lib/money";

export const settlementPayloadSchema = z
  .object({
    fromUserId: z.string().min(1, "Payer is required"),
    toUserId: z.string().min(1, "Recipient is required"),
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
    date: z.iso.date("Date must be in YYYY-MM-DD format"),
    note: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: "Payer and recipient must be different members",
    path: ["toUserId"],
  });

export type SettlementPayload = z.infer<typeof settlementPayloadSchema>;
