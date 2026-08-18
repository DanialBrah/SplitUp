import { prisma } from "@/lib/prisma";

export function listUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
