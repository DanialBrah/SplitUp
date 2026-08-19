export interface MemberRoleInfo {
  userId: string;
  role: "ADMIN" | "MEMBER";
}

/**
 * Pure predicate behind the "a group must always have at least one admin"
 * guard - kept Prisma-free (unlike lib/groups.ts, which calls this with data
 * it already fetched) so the actual decision logic is unit-testable without a
 * database, the same split used for lib/balances.ts vs lib/balances-query.ts.
 */
export function wouldLeaveNoAdmins(
  members: MemberRoleInfo[],
  affectedUserIds: string[]
): boolean {
  const remainingAdmins = members.filter(
    (m) => m.role === "ADMIN" && !affectedUserIds.includes(m.userId)
  );
  return remainingAdmins.length === 0;
}
