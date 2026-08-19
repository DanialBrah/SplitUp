import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { requireGroupMember } from "@/lib/session";
import { createSettlement, listSettlementsForGroup } from "@/lib/settlements";
import { settlementPayloadSchema } from "@/lib/validation/settlement-payload";

type Context = { params: Promise<{ groupId: string }> };

export const GET = withErrorHandling<Context>(async (_req, { params }) => {
  const { groupId } = await params;
  await requireGroupMember(groupId);
  const settlements = await listSettlementsForGroup(groupId);
  return NextResponse.json(settlements);
});

export const POST = withErrorHandling<Context>(async (req, { params }) => {
  const { groupId } = await params;
  await requireGroupMember(groupId);
  const body = await req.json();
  const payload = settlementPayloadSchema.parse(body);
  const settlement = await createSettlement(groupId, payload);
  return NextResponse.json(settlement, { status: 201 });
});
