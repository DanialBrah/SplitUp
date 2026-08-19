import { prisma } from "@/lib/prisma";

export function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}
