const DOLLARS_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Parses a decimal dollar string (e.g. "12.5") into an integer cent count.
 * String-based on purpose: parseFloat(x) * 100 can misround (e.g. 0.1 + 0.2).
 */
export function dollarsToCents(input: string): number {
  const trimmed = input.trim();
  if (!DOLLARS_PATTERN.test(trimmed)) {
    throw new Error(`Invalid amount: "${input}"`);
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const cents = fraction.padEnd(2, "0");
  return Number(whole) * 100 + Number(cents);
}

export function centsToDollars(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${remainder}`;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
