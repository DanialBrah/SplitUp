import { z } from "zod";

export const groupPayloadSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : undefined)),
  memberIds: z.array(z.string().min(1)).min(1, "Select at least one member"),
});

export type GroupPayload = z.infer<typeof groupPayloadSchema>;
