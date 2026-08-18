import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { createGroup, listGroups } from "@/lib/groups";
import { groupPayloadSchema } from "@/lib/validation/group-payload";

export const GET = withErrorHandling(async () => {
  const groups = await listGroups();
  return NextResponse.json(groups);
});

export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const payload = groupPayloadSchema.parse(body);
  const group = await createGroup(payload);
  return NextResponse.json(group, { status: 201 });
});
