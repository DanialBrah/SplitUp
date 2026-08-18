import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { deleteGroup, getGroupOrThrow, updateGroup } from "@/lib/groups";
import { groupPayloadSchema } from "@/lib/validation/group-payload";

type Context = { params: Promise<{ groupId: string }> };

export const GET = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId } = await params;
  const group = await getGroupOrThrow(groupId);
  return NextResponse.json(group);
});

export const PUT = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId } = await params;
  const body = await req.json();
  const payload = groupPayloadSchema.parse(body);
  const group = await updateGroup(groupId, payload);
  return NextResponse.json(group);
});

export const DELETE = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId } = await params;
  await deleteGroup(groupId);
  return new NextResponse(null, { status: 204 });
});
