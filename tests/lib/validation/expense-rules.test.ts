import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  assertNoDuplicateSplitMembers,
  assertPayerIsMember,
  assertPositiveAmount,
  assertSplitMembersAreGroupMembers,
  assertSplitSumsToTotal,
} from "@/lib/validation/expense-rules";

describe("assertPositiveAmount", () => {
  it("rejects zero and negative amounts", () => {
    expect(() => assertPositiveAmount(0)).toThrow(AppError);
    expect(() => assertPositiveAmount(-100)).toThrow(AppError);
  });

  it("rejects non-integer amounts", () => {
    expect(() => assertPositiveAmount(10.5)).toThrow(AppError);
  });

  it("accepts a positive integer amount", () => {
    expect(() => assertPositiveAmount(1500)).not.toThrow();
  });
});

describe("assertPayerIsMember", () => {
  it("rejects a payer who is not a group member", () => {
    expect(() => assertPayerIsMember("dave", ["alice", "bob"])).toThrow(AppError);
  });

  it("accepts a payer who is a group member", () => {
    expect(() => assertPayerIsMember("alice", ["alice", "bob"])).not.toThrow();
  });
});

describe("assertSplitSumsToTotal", () => {
  it("rejects splits that don't sum to the total (the AI-introduced-bug case)", () => {
    const buggySplits = [
      { userId: "alice", shareCents: 334 },
      { userId: "bob", shareCents: 333 },
      { userId: "carol", shareCents: 332 }, // off by one cent
    ];
    expect(() => assertSplitSumsToTotal(buggySplits, 1000)).toThrow(AppError);
  });

  it("accepts splits that sum exactly to the total", () => {
    const correctSplits = [
      { userId: "alice", shareCents: 334 },
      { userId: "bob", shareCents: 333 },
      { userId: "carol", shareCents: 333 },
    ];
    expect(() => assertSplitSumsToTotal(correctSplits, 1000)).not.toThrow();
  });
});

describe("assertSplitMembersAreGroupMembers", () => {
  it("rejects a split for someone outside the group", () => {
    const splits = [
      { userId: "alice", shareCents: 500 },
      { userId: "dave", shareCents: 500 },
    ];
    expect(() =>
      assertSplitMembersAreGroupMembers(splits, ["alice", "bob"])
    ).toThrow(AppError);
  });
});

describe("assertNoDuplicateSplitMembers", () => {
  it("rejects the same member appearing twice", () => {
    const splits = [
      { userId: "alice", shareCents: 500 },
      { userId: "alice", shareCents: 500 },
    ];
    expect(() => assertNoDuplicateSplitMembers(splits)).toThrow(AppError);
  });
});
