import type { ParsedRow } from "@/types/finance";
import { todayISO } from "@/lib/finance";

/** Safely turn the AI's raw text into rows. Returns null when the JSON is unusable. */
export function parseAIRows(raw: unknown, categories: string[]): Omit<ParsedRow, "id">[] | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : (data as { transactions?: unknown })?.transactions;
  if (!Array.isArray(list)) return null;
  const out: Omit<ParsedRow, "id">[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as { amount?: unknown; date?: unknown; category?: unknown; type?: unknown; note?: unknown; confidence?: unknown; reason?: unknown };
    const amount = Math.abs(Number(String(r.amount ?? "").replace(/[^0-9.-]/g, "")));
    const dateOk = typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date);
    const cat = categories.find((c) => c.toLowerCase() === String(r.category ?? "").toLowerCase());
    const type = r.type === "income" ? "income" : "expense";
    const issues: string[] = [];
    if (!dateOk) issues.push("date unclear");
    if (!cat) issues.push("category unclear");
    if (!(amount > 0)) issues.push("amount unclear");
    out.push({
      date: dateOk ? (r.date as string) : todayISO(),
      amount: amount > 0 ? amount : 0,
      type,
      category: cat ?? "Other",
      note: typeof r.note === "string" ? r.note : "",
      confidence: r.confidence === "low" || issues.length ? "low" : "high",
      reason: issues.length ? issues.join(", ") : typeof r.reason === "string" ? r.reason : undefined,
    });
  }
  return out;
}
