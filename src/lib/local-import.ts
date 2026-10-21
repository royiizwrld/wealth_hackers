import type { Transaction } from "@/types/finance";

export const LEGACY_KEY = "fintrack:v1";

/** Reads transactions saved on this device before accounts existed (sample rows excluded). */
export function readLegacyLocal(): Transaction[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { transactions?: Transaction[] };
    return (parsed.transactions ?? []).filter(
      (t) => !t.sample && Number(t.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && typeof t.category === "string",
    );
  } catch {
    return [];
  }
}

const key = (t: Pick<Transaction, "date" | "amount" | "type" | "category" | "note">) =>
  `${t.date}|${Math.round(Number(t.amount) * 100)}|${t.type}|${t.category.toLowerCase()}|${(t.note ?? "").trim().toLowerCase()}`;

/** Local rows that are not already in the account (and not repeated within the local list). */
export function dedupeForImport(local: Transaction[], cloud: Transaction[]): Transaction[] {
  const seen = new Set(cloud.map(key));
  const out: Transaction[] = [];
  for (const t of local) {
    const k = key(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
