import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { createGroup, listGroups } from "@/lib/groups";
import { requireUser } from "@/lib/session";
import { groupPayloadSchema } from "@/lib/validation/group-payload";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const groups = await listGroups(user.id);
  return NextResponse.json(groups);
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await req.json();
  const payload = groupPayloadSchema.parse(body);
  const group = await createGroup(payload, user.id);
  return NextResponse.json(group, { status: 201 });
});
