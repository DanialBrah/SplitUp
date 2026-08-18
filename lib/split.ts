export interface Share {
  userId: string;
  shareCents: number;
}

/**
 * Splits totalCents equally across memberIds. Cent-level remainder is handed
 * out one at a time to the first `remainder` members (in array order) so the
 * shares always sum EXACTLY to totalCents, even when it doesn't divide evenly
 * (e.g. 1000 cents across 3 people -> 334 + 333 + 333).
 */
export function splitEqually(totalCents: number, memberIds: string[]): Share[] {
  if (memberIds.length === 0) {
    throw new Error("Cannot split an expense with no members");
  }
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Cannot split a non-positive amount");
  }

  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;

  return memberIds.map((userId, index) => ({
    userId,
    shareCents: base + (index < remainder ? 1 : 0),
  }));
}
