import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { addMember } from "@/lib/groups";
import { requireGroupAdmin } from "@/lib/session";
import { addMemberPayloadSchema } from "@/lib/validation/add-member-payload";

type Context = { params: Promise<{ groupId: string }> };

export const POST = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId } = await params;
  await requireGroupAdmin(groupId);
  const body = await req.json();
  const { userId } = addMemberPayloadSchema.parse(body);
  const group = await addMember(groupId, userId);
  return NextResponse.json(group, { status: 201 });
});
