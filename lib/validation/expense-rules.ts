import { badRequest } from "@/lib/errors";
import type { Share } from "@/lib/split";

export function assertPositiveAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw badRequest("Amount must be a positive number");
  }
}

export function assertPayerIsMember(payerId: string, memberIds: string[]): void {
  if (!memberIds.includes(payerId)) {
    throw badRequest("Payer must be a member of the group");
  }
}

export function assertSplitMembersAreGroupMembers(
  splits: Share[],
  memberIds: string[]
): void {
  const invalid = splits.find((s) => !memberIds.includes(s.userId));
  if (invalid) {
    throw badRequest("All split members must belong to the group");
  }
}

export function assertNoDuplicateSplitMembers(splits: Share[]): void {
  const seen = new Set<string>();
  for (const split of splits) {
    if (seen.has(split.userId)) {
      throw badRequest("A member cannot appear twice in the same split");
    }
    seen.add(split.userId);
  }
}

export function assertSplitSumsToTotal(splits: Share[], totalCents: number): void {
  const sum = splits.reduce((total, s) => total + s.shareCents, 0);
  if (sum !== totalCents) {
    throw badRequest(
      `Split amounts (${sum}) must add up to the expense total (${totalCents})`
    );
  }
}

export function assertPercentagesSumTo100(basisPoints: number[]): void {
  const sum = basisPoints.reduce((total, bps) => total + bps, 0);
  if (sum !== 10000) {
    throw badRequest(`Percentages must add up to 100 (got ${sum / 100})`);
  }
}
