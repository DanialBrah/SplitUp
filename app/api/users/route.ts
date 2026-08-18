import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api-handler";
import { listUsers } from "@/lib/users";

export const GET = withErrorHandling(async () => {
  const users = await listUsers();
  return NextResponse.json(users);
});
