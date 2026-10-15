import type { DateRange, Transaction } from "@/types/finance";

export const DEFAULT_CATEGORIES = [
  "Food",
  "Rent",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Salary",
  "Other",
];

export const CURRENCIES: { code: string; name: string }[] = [
  { code: "KES", name: "Kenyan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "ZAR", name: "South African Rand" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "CHF", name: "Swiss Franc" },
];

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const monthKey = (date: string) => date.slice(0, 7);

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function inRange(t: Transaction, r: DateRange) {
  if (r.from && t.date < r.from) return false;
  if (r.to && t.date > r.to) return false;
  return true;
}

export function totals(txs: Transaction[]) {
  let income = 0;
  let expenses = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export function spendingByCategory(txs: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === "expense") map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function byMonth(txs: Transaction[]) {
  const map = new Map<string, { month: string; income: number; expenses: number }>();
  for (const t of txs) {
    const k = monthKey(t.date);
    const row = map.get(k) ?? { month: k, income: 0, expenses: 0 };
    if (t.type === "income") row.income += t.amount;
    else row.expenses += t.amount;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(txs: Transaction[]) {
  const rows = [["date", "type", "category", "amount", "note"]];
  for (const t of txs) rows.push([t.date, t.type, t.category, String(t.amount), t.note ?? ""]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** A candidate is a possible duplicate if an existing transaction has the same date, type and amount. */
export function findDuplicate(
  c: { date: string; amount: number; type: string; note?: string },
  existing: Transaction[],
) {
  return existing.find(
    (t) =>
      t.date === c.date &&
      t.type === c.type &&
      Math.abs(t.amount - c.amount) < 0.005 &&
      (!c.note || !t.note || norm(t.note).includes(norm(c.note).slice(0, 4)) || true),
  );
}

/** Compact data summary sent to the AI assistant. */
export function buildSummary(
  txs: Transaction[],
  goal: number,
  currency: string,
  categories: string[],
) {
  const months: Record<string, Record<string, number>> = {};
  for (const t of txs) {
    const m = monthKey(t.date);
    months[m] ??= { _income: 0, _expenses: 0 };
    if (t.type === "income") months[m]._income += t.amount;
    else {
      months[m]._expenses += t.amount;
      months[m][t.category] = (months[m][t.category] ?? 0) + t.amount;
    }
  }
  const recent = [...txs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map((t) => `${t.date} ${t.type} ${t.category} ${t.amount}${t.note ? ` (${t.note})` : ""}`);
  return {
    today: todayISO(),
    currency,
    monthlySavingsGoal: goal || null,
    categories,
    monthlyTotals: months,
    recentTransactions: recent,
    transactionCount: txs.length,
  };
}

export function sampleData(): Transaction[] {
  const now = new Date();
  const d = (monthsAgo: number, day: number) =>
    todayISO(new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, 28)));
  const items: [number, number, "income" | "expense", string, number, string][] = [
    [0, 1, "income", "Salary", 85000, "Monthly salary"],
    [0, 2, "expense", "Rent", 25000, "Apartment rent"],
    [0, 4, "expense", "Food", 3200, "Groceries"],
    [0, 6, "expense", "Transport", 1500, "Uber rides"],
    [0, 8, "expense", "Utilities", 4200, "Electricity + water"],
    [0, 10, "expense", "Entertainment", 2500, "Cinema"],
    [0, 12, "expense", "Food", 950, "Lunch out"],
    [1, 1, "income", "Salary", 85000, "Monthly salary"],
    [1, 2, "expense", "Rent", 25000, "Apartment rent"],
    [1, 5, "expense", "Food", 7800, "Groceries"],
    [1, 9, "expense", "Shopping", 6400, "Shoes"],
    [1, 14, "expense", "Health", 2000, "Pharmacy"],
    [1, 20, "expense", "Transport", 3100, "Fuel"],
    [2, 1, "income", "Salary", 85000, "Monthly salary"],
    [2, 2, "expense", "Rent", 25000, "Apartment rent"],
    [2, 7, "expense", "Food", 6900, "Groceries"],
    [2, 18, "expense", "Entertainment", 4800, "Concert"],
    [2, 22, "income", "Other", 12000, "Freelance gig"],
  ];
  return items.map(([m, day, type, category, amount, note]) => ({
    id: uid(),
    date: d(m, day),
    type,
    category,
    amount,
    note,
    sample: true,
  }));
}
