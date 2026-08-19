import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conflict } from "@/lib/errors";
import type { RegisterPayload } from "@/lib/validation/register-payload";

export function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

export async function createUser(payload: RegisterPayload) {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw conflict("An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  return prisma.user.create({
    data: { name: payload.name, email: payload.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}
