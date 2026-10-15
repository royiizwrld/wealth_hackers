export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  note?: string;
  sample?: boolean;
}

export interface SavingsGoal {
  monthlyTarget: number;
}

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;
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
  reason?: string;
}
