import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DateRange, Transaction } from "@/types/finance";
import { DEFAULT_CATEGORIES, formatMoney, sampleData, uid } from "@/lib/finance";

const KEY = "fintrack:v1";

interface Stored {
  transactions: Transaction[];
  categories: string[];
  goal: number;
  currency: string;
  theme: "light" | "dark";
}

interface FinanceCtx extends Stored {
  ready: boolean;
  range: DateRange;
  setRange: (r: DateRange) => void;
  addTransactions: (t: Omit<Transaction, "id">[]) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: string) => boolean;
  setGoal: (n: number) => void;
  setCurrency: (c: string) => void;
  setTheme: (t: "light" | "dark") => void;
  clearSample: () => void;
  hasSample: boolean;
  money: (n: number) => string;
}

const Ctx = createContext<FinanceCtx | null>(null);

const initial: Stored = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  goal: 20000,
  currency: "KES",
  theme: "light",
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(initial);
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<DateRange>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
      else setState({ ...initial, transactions: sampleData() });
    } catch {
      setState({ ...initial, transactions: sampleData() });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const addTransactions = useCallback((list: Omit<Transaction, "id">[]) => {
    setState((s) => ({ ...s, transactions: [...list.map((t) => ({ ...t, id: uid() })), ...s.transactions] }));
  }, []);
  const updateTransaction = useCallback((t: Transaction) => {
    setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === t.id ? t : x)) }));
  }, []);
  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) }));
  }, []);

  const value = useMemo<FinanceCtx>(
    () => ({
      ...state,
      ready,
      range,
      setRange,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addCategory: (c) => {
        const name = c.trim();
        if (!name || state.categories.some((x) => x.toLowerCase() === name.toLowerCase())) return false;
        setState((s) => ({ ...s, categories: [...s.categories, name] }));
        return true;
      },
      setGoal: (goal) => setState((s) => ({ ...s, goal })),
      setCurrency: (currency) => setState((s) => ({ ...s, currency })),
      setTheme: (theme) => setState((s) => ({ ...s, theme })),
      clearSample: () => setState((s) => ({ ...s, transactions: s.transactions.filter((t) => !t.sample) })),
      hasSample: state.transactions.some((t) => t.sample),
      money: (n) => formatMoney(n, state.currency),
    }),
    [state, ready, range, addTransactions, updateTransaction, deleteTransaction],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinance must be used inside FinanceProvider");
  return c;
}
