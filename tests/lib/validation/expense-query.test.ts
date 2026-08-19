import { describe, expect, it } from "vitest";
import { parseExpenseQuery } from "@/lib/validation/expense-query";

describe("parseExpenseQuery", () => {
  it("applies defaults when no params are given", () => {
    const result = parseExpenseQuery({});
    expect(result).toEqual({
      sortBy: "date",
      sortDir: "desc",
      page: 1,
      pageSize: 20,
    });
  });

  it("strips empty-string params (unselected <select>)", () => {
    const result = parseExpenseQuery({ category: "", payerId: "" });
    expect(result.category).toBeUndefined();
    expect(result.payerId).toBeUndefined();
  });

  it("coerces page/pageSize strings to numbers", () => {
    const result = parseExpenseQuery({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("caps pageSize at 100", () => {
    expect(() => parseExpenseQuery({ pageSize: "500" })).toThrow();
  });

  it("takes the first value when given an array (Next's searchParams shape)", () => {
    const result = parseExpenseQuery({ sortBy: ["amount", "date"] });
    expect(result.sortBy).toBe("amount");
  });

  it("rejects an invalid category", () => {
    expect(() => parseExpenseQuery({ category: "NOT_A_CATEGORY" })).toThrow();
  });

  it("accepts valid filters", () => {
    const result = parseExpenseQuery({
      category: "FOOD",
      payerId: "user-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
      sortBy: "amount",
      sortDir: "asc",
    });
    expect(result.category).toBe("FOOD");
    expect(result.payerId).toBe("user-1");
    expect(result.sortBy).toBe("amount");
    expect(result.sortDir).toBe("asc");
  });
});
