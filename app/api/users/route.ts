import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { requireUser } from "@/lib/session";
import { listUsers } from "@/lib/users";

export const GET = withErrorHandling(async () => {
  await requireUser();
  const users = await listUsers();
  return NextResponse.json(users);
});
