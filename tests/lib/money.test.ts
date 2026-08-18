import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, formatCents } from "@/lib/money";

describe("dollarsToCents", () => {
  it("parses whole dollar amounts", () => {
    expect(dollarsToCents("10")).toBe(1000);
  });

  it("parses amounts with cents", () => {
    expect(dollarsToCents("12.50")).toBe(1250);
  });

  it("pads a single decimal digit", () => {
    expect(dollarsToCents("0.5")).toBe(50);
  });

  it("rejects malformed input", () => {
    expect(() => dollarsToCents("abc")).toThrow();
    expect(() => dollarsToCents("12.999")).toThrow();
    expect(() => dollarsToCents("")).toThrow();
  });

  it("rejects negative input", () => {
    expect(() => dollarsToCents("-5")).toThrow();
  });
});

describe("centsToDollars", () => {
  it("formats cents back into a dollar string", () => {
    expect(centsToDollars(1250)).toBe("12.50");
    expect(centsToDollars(5)).toBe("0.05");
  });
});

describe("formatCents", () => {
  it("formats as USD currency", () => {
    expect(formatCents(1250)).toBe("$12.50");
  });
});
