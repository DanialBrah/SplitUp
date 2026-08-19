import { auth } from "@/auth";
import { forbidden, unauthorized } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw unauthorized();
  }
  return session.user;
}

export async function requireGroupMember(groupId: string) {
  const user = await requireUser();
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) {
    throw forbidden();
  }
  return user;
}
