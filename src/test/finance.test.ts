import { describe, expect, it } from "vitest";
import { findDuplicate, toCSV, totals } from "@/lib/finance";
import { parseAIRows } from "@/lib/parse-rows";
import type { Transaction } from "@/types/finance";

const tx = (p: Partial<Transaction>): Transaction => ({ id: "1", amount: 100, date: "2026-10-01", type: "expense", category: "Food", ...p });

describe("finance rules", () => {
  it("net savings = income - expenses", () => {
    expect(totals([tx({ type: "income", amount: 85000 }), tx({ amount: 450 }), tx({ amount: 800 })])).toEqual({ income: 85000, expenses: 1250, net: 83750 });
  });
  it("CSV has date,type,category,amount,note columns and escapes commas", () => {
    expect(toCSV([tx({ note: "lunch, cafe" })])).toBe('date,type,category,amount,note\n2026-10-01,expense,Food,100,"lunch, cafe"');
  });
  it("flags same date+type+amount as duplicate", () => {
    expect(findDuplicate({ date: "2026-10-01", amount: 100, type: "expense" }, [tx({})])).toBeTruthy();
    expect(findDuplicate({ date: "2026-10-02", amount: 100, type: "expense" }, [tx({})])).toBeUndefined();
  });
  it("returns null on invalid AI JSON and low confidence on unknown category", () => {
    expect(parseAIRows("not json", ["Food"])).toBeNull();
    const rows = parseAIRows('{"transactions":[{"date":"2026-10-01","amount":450,"type":"expense","category":"Snacks","note":"x"}]}', ["Food", "Other"]);
    expect(rows?.[0].category).toBe("Other");
    expect(rows?.[0].confidence).toBe("low");
  });
});
