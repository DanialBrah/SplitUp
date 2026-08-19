import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/errors";
import type { SettlementPayload } from "@/lib/validation/settlement-payload";

const settlementInclude = {
  fromUser: { select: { id: true, name: true, email: true } },
  toUser: { select: { id: true, name: true, email: true } },
} as const;

export function listSettlementsForGroup(groupId: string) {
  return prisma.settlement.findMany({
    where: { groupId },
    orderBy: { date: "desc" },
    include: settlementInclude,
  });
}

export async function createSettlement(groupId: string, payload: SettlementPayload) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);

  if (!memberIds.includes(payload.fromUserId) || !memberIds.includes(payload.toUserId)) {
    throw badRequest("Both members must belong to the group");
  }

  return prisma.settlement.create({
    data: {
      groupId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      amountCents: payload.amount,
      date: new Date(payload.date),
      note: payload.note,
    },
    include: settlementInclude,
  });
}

export async function deleteSettlement(groupId: string, settlementId: string) {
  const settlement = await prisma.settlement.findFirst({
    where: { id: settlementId, groupId },
  });
  if (!settlement) throw notFound("Settlement");
  await prisma.settlement.delete({ where: { id: settlementId } });
}
