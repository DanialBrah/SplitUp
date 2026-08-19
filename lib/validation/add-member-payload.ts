import { z } from "zod";

export const addMemberPayloadSchema = z.object({
  userId: z.string().min(1, "Select a user to add"),
});

export type AddMemberPayload = z.infer<typeof addMemberPayloadSchema>;
