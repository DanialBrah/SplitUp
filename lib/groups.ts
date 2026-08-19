import type { GroupRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { conflict, notFound } from "@/lib/errors";
import { wouldLeaveNoAdmins } from "@/lib/group-roles";
import type { GroupPayload } from "@/lib/validation/group-payload";

const groupInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

export function listGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: groupInclude,
  });
}

export async function getGroupOrThrow(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: groupInclude,
  });
  if (!group) throw notFound("Group");
  return group;
}

export function createGroup(payload: GroupPayload, creatorId: string) {
  const memberIds = payload.memberIds.includes(creatorId)
    ? payload.memberIds
    : [...payload.memberIds, creatorId];

  return prisma.group.create({
    data: {
      name: payload.name,
      description: payload.description,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === creatorId ? "ADMIN" : "MEMBER",
        })),
      },
    },
    include: groupInclude,
  });
}

export async function updateGroup(id: string, payload: GroupPayload) {
  const existing = await getGroupOrThrow(id);
  const existingMemberIds = existing.members.map((m) => m.userId);
  const nextMemberIds = payload.memberIds;

  const toRemove = existingMemberIds.filter((m) => !nextMemberIds.includes(m));
  const toAdd = nextMemberIds.filter((m) => !existingMemberIds.includes(m));

  if (toRemove.length > 0) {
    const involvedCount = await prisma.expense.count({
      where: {
        groupId: id,
        OR: [
          { payerId: { in: toRemove } },
          { splits: { some: { userId: { in: toRemove } } } },
        ],
      },
    });
    if (involvedCount > 0) {
      throw conflict(
        "Cannot remove a member who already has expenses recorded in this group"
      );
    }

    if (wouldLeaveNoAdmins(existing.members, toRemove)) {
      throw conflict("A group must always have at least one admin");
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: { id },
      data: { name: payload.name, description: payload.description },
    });

    if (toRemove.length > 0) {
      await tx.groupMember.deleteMany({
        where: { groupId: id, userId: { in: toRemove } },
      });
    }
    if (toAdd.length > 0) {
      await tx.groupMember.createMany({
        data: toAdd.map((userId) => ({ groupId: id, userId })),
      });
    }

    return tx.group.findUniqueOrThrow({ where: { id }, include: groupInclude });
  });
}

export async function updateMemberRole(groupId: string, userId: string, role: GroupRole) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw notFound("Membership");
  if (membership.role === role) return membership;

  if (membership.role === "ADMIN" && role === "MEMBER") {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, role: true },
    });
    if (wouldLeaveNoAdmins(members, [userId])) {
      throw conflict("A group must always have at least one admin");
    }
  }

  return prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role },
  });
}

export async function addMember(groupId: string, userId: string) {
  await getGroupOrThrow(groupId);

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (existing) {
    throw conflict("This user is already a member of this group");
  }

  await prisma.groupMember.create({
    data: { groupId, userId, role: "MEMBER" },
  });

  return getGroupOrThrow(groupId);
}

export async function removeMember(groupId: string, userId: string) {
  const group = await getGroupOrThrow(groupId);
  const membership = group.members.find((m) => m.userId === userId);
  if (!membership) throw notFound("Membership");

  const involvedCount = await prisma.expense.count({
    where: {
      groupId,
      OR: [{ payerId: userId }, { splits: { some: { userId } } }],
    },
  });
  if (involvedCount > 0) {
    throw conflict(
      "Cannot remove a member who already has expenses recorded in this group"
    );
  }

  if (membership.role === "ADMIN" && wouldLeaveNoAdmins(group.members, [userId])) {
    throw conflict("A group must always have at least one admin");
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });
}

export async function deleteGroup(id: string) {
  await getGroupOrThrow(id);
  await prisma.group.delete({ where: { id } });
}
