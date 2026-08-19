import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { requireGroupMember } from "@/lib/session";
import { deleteSettlement } from "@/lib/settlements";

type Context = { params: Promise<{ groupId: string; settlementId: string }> };

export const DELETE = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId, settlementId } = await params;
  await requireGroupMember(groupId);
  await deleteSettlement(groupId, settlementId);
  return new NextResponse(null, { status: 204 });
});
