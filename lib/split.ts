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

const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/**
 * Parses a percentage string (e.g. "33.34") into basis points (0-10000),
 * string-based like dollarsToCents so it never goes through float
 * multiplication (33.34 * 100 === 3334.0000000000005 in real JS).
 */
export function parsePercentageToBasisPoints(input: string): number {
  const trimmed = input.trim();
  if (!PERCENT_PATTERN.test(trimmed)) {
    throw new Error(`Invalid percentage: "${input}"`);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (bps > 10000) {
    throw new Error(`Percentage out of range: "${input}"`);
  }
  return bps;
}

/**
 * Thin pass-through for exact-amount splits — the entries already carry the
 * per-member cent amount; assertSplitSumsToTotal (caller's responsibility)
 * does the reconciliation check.
 */
export function splitByExactAmounts(
  entries: { userId: string; amountCents: number }[]
): Share[] {
  return entries.map((e) => ({ userId: e.userId, shareCents: e.amountCents }));
}

export interface PercentageShare extends Share {
  percentageBps: number;
}

/**
 * Splits totalCents by percentage (in basis points, 0-10000) using the
 * largest-remainder method: floor each share, then hand out the leftover
 * cents to the entries with the largest fractional remainder first, so
 * shares always sum EXACTLY to totalCents (e.g. $10.00 at 33.33/33.33/33.34%
 * -> 333/333/334, not 333/333/333 which would be a cent short).
 */
export function splitByPercentages(
  totalCents: number,
  entries: { userId: string; percentageBps: number }[]
): PercentageShare[] {
  if (entries.length === 0) {
    throw new Error("Cannot split an expense with no members");
  }
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Cannot split a non-positive amount");
  }

  const raw = entries.map((e) => ({
    userId: e.userId,
    percentageBps: e.percentageBps,
    floor: Math.floor((totalCents * e.percentageBps) / 10000),
    remainder: (totalCents * e.percentageBps) % 10000,
  }));

  const flooredTotal = raw.reduce((sum, r) => sum + r.floor, 0);
  const deficit = totalCents - flooredTotal;

  const bumpOrder = [...raw].sort((a, b) => b.remainder - a.remainder);
  const bumped = new Set(bumpOrder.slice(0, deficit).map((r) => r.userId));

  return raw.map((r) => ({
    userId: r.userId,
    percentageBps: r.percentageBps,
    shareCents: r.floor + (bumped.has(r.userId) ? 1 : 0),
  }));
}
