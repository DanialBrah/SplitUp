import { describe, expect, it } from "vitest";
import { wouldLeaveNoAdmins } from "@/lib/group-roles";

const members = [
  { userId: "alice", role: "ADMIN" as const },
  { userId: "bob", role: "MEMBER" as const },
  { userId: "carol", role: "MEMBER" as const },
];

describe("wouldLeaveNoAdmins", () => {
  it("is true when removing the group's only admin", () => {
    expect(wouldLeaveNoAdmins(members, ["alice"])).toBe(true);
  });

  it("is false when removing a non-admin", () => {
    expect(wouldLeaveNoAdmins(members, ["bob"])).toBe(false);
  });

  it("is false when a second admin remains untouched", () => {
    const twoAdmins = [...members, { userId: "dave", role: "ADMIN" as const }];
    expect(wouldLeaveNoAdmins(twoAdmins, ["alice"])).toBe(false);
  });

  it("is true when removing every admin among several affected users", () => {
    const twoAdmins = [...members, { userId: "dave", role: "ADMIN" as const }];
    expect(wouldLeaveNoAdmins(twoAdmins, ["alice", "dave", "bob"])).toBe(true);
  });

  it("is false when removing several non-admins and one admin remains", () => {
    const twoAdmins = [...members, { userId: "dave", role: "ADMIN" as const }];
    expect(wouldLeaveNoAdmins(twoAdmins, ["bob", "carol"])).toBe(false);
  });

  it("is false for an empty affected list (no-op change)", () => {
    expect(wouldLeaveNoAdmins(members, [])).toBe(false);
  });

  it("is true for an empty member list (vacuously no admins remain)", () => {
    expect(wouldLeaveNoAdmins([], ["alice"])).toBe(true);
  });
});
