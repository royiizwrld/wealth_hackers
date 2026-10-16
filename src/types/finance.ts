export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  note?: string | undefined;
  originalAmount?: number | undefined;
  originalCurrency?: string | undefined;
  sample?: boolean;
}

export interface SavingsGoal {
  monthlyTarget: number;
}

export interface DateRange {
  from?: string | undefined; // YYYY-MM-DD
  to?: string | undefined;
}

export interface FinanceSettings {
  currency: string;
  theme: "light" | "dark";
}

export interface ParsedRow {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  confidence: "high" | "low";
  reason?: string | undefined;
}
