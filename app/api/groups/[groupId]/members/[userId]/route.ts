import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { removeMember, updateMemberRole } from "@/lib/groups";
import { requireGroupAdmin } from "@/lib/session";
import { memberRolePayloadSchema } from "@/lib/validation/member-role-payload";

type Context = { params: Promise<{ groupId: string; userId: string }> };

export const PATCH = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId, userId } = await params;
  await requireGroupAdmin(groupId);
  const body = await req.json();
  const { role } = memberRolePayloadSchema.parse(body);
  const member = await updateMemberRole(groupId, userId, role);
  return NextResponse.json(member);
});

export const DELETE = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId, userId } = await params;
  await requireGroupAdmin(groupId);
  await removeMember(groupId, userId);
  return new NextResponse(null, { status: 204 });
});
