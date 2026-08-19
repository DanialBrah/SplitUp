import { z } from "zod";

export const memberRolePayloadSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export type MemberRolePayload = z.infer<typeof memberRolePayloadSchema>;
