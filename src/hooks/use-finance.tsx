import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { DateRange, Transaction } from "@/types/finance";
import { DEFAULT_CATEGORIES, formatMoney, sampleData, uid } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";

const KEY = "fintrack:v1";

interface Stored {
  transactions: Transaction[];
  categories: string[];
  goal: number;
  currency: string;
  theme: "light" | "dark";
  palette: string;
  budgets: Record<string, number>;
}

interface FinanceCtx extends Stored {
  ready: boolean;
  user: User | null;
  syncing: boolean;
  signOut: () => Promise<void>;
  range: DateRange;
  setRange: (r: DateRange) => void;
  addTransactions: (t: Omit<Transaction, "id">[]) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: string) => boolean;
  setGoal: (n: number) => void;
  setCurrency: (c: string) => void;
  setTheme: (t: "light" | "dark") => void;
  setPalette: (p: string) => void;
  setBudget: (category: string, limit: number | null) => void;
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
  palette: "default",
  budgets: {},
};

type TxRow = {
  id: string;
  amount: number;
  date: string;
  type: string;
  category: string;
  note: string | null;
  original_amount: number | null;
  original_currency: string | null;
  sample: boolean;
};

const toRow = (t: Transaction) => ({
  id: t.id,
  amount: t.amount,
  date: t.date,
  type: t.type,
  category: t.category,
  note: t.note ?? null,
  original_amount: t.originalAmount ?? null,
  original_currency: t.originalCurrency ?? null,
  sample: !!t.sample,
});

const fromRow = (r: TxRow): Transaction => ({
  id: r.id,
  amount: Number(r.amount),
  date: r.date,
  type: r.type === "income" ? "income" : "expense",
  category: r.category,
  note: r.note ?? undefined,
  originalAmount: r.original_amount == null ? undefined : Number(r.original_amount),
  originalCurrency: r.original_currency ?? undefined,
  sample: r.sample,
});

function loadLocal(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...initial, transactions: sampleData() };
}

function reportError(error: unknown) {
  if (error) console.error("Sync failed", error);
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(initial);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState<DateRange>({});
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Load data for the current identity (local when signed out, cloud when signed in).
  const loadFor = useCallback(async (u: User | null) => {
    if (!u) {
      setState(loadLocal());
      setReady(true);
      return;
    }
    setSyncing(true);
    const [{ data: settings }, { data: txs }] = await Promise.all([
      supabase.from("finance_settings").select("*").eq("user_id", u.id).maybeSingle(),
      supabase.from("finance_transactions").select("*").eq("user_id", u.id).order("date", { ascending: false }),
    ]);
    if (!settings) {
      // First sign-in: move this browser's data into the account.
      const local = loadLocal();
      const rows = local.transactions.map((t) => ({ ...toRow({ ...t, id: crypto.randomUUID() }), user_id: u.id }));
      await supabase.from("finance_settings").insert({
        user_id: u.id,
        categories: local.categories,
        goal: local.goal,
        currency: local.currency,
        theme: local.theme,
        palette: local.palette,
        budgets: local.budgets,
      });
      if (rows.length) await supabase.from("finance_transactions").insert(rows);
      setState({ ...local, transactions: rows.map((r) => fromRow(r as TxRow)) });
    } else {
      setState({
        transactions: (txs ?? []).map((r) => fromRow(r as TxRow)),
        categories: settings.categories?.length ? settings.categories : DEFAULT_CATEGORIES,
        goal: Number(settings.goal),
        currency: settings.currency,
        theme: settings.theme === "dark" ? "dark" : "light",
        palette: settings.palette,
        budgets: (settings.budgets as Record<string, number>) ?? {},
      });
    }
    setSyncing(false);
    setReady(true);
  }, []);

  useEffect(() => {
    let current: string | null | undefined;
    supabase.auth.getUser().then(({ data }) => {
      current = data.user?.id ?? null;
      setUser(data.user);
      loadFor(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const u = session?.user ?? null;
      if ((u?.id ?? null) === current) return;
      current = u?.id ?? null;
      setUser(u);
      setReady(false);
      loadFor(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadFor]);

  // Signed-out mode keeps everything in this browser.
  useEffect(() => {
    if (ready && !user) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready, user]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", state.theme === "dark");
    el.dataset["palette"] = state.palette;
  }, [state.theme, state.palette]);

  const saveSettings = useCallback((patch: Record<string, unknown>) => {
    const u = userRef.current;
    if (!u) return;
    supabase
      .from("finance_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", u.id)
      .then(({ error }) => reportError(error));
  }, []);

  const addTransactions = useCallback((list: Omit<Transaction, "id">[]) => {
    const withIds = list.map((t) => ({ ...t, id: uid() }));
    setState((s) => ({ ...s, transactions: [...withIds, ...s.transactions] }));
    const u = userRef.current;
    if (u) supabase.from("finance_transactions").insert(withIds.map((t) => ({ ...toRow(t), user_id: u.id }))).then(({ error }) => reportError(error));
  }, []);
  const updateTransaction = useCallback((t: Transaction) => {
    setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === t.id ? t : x)) }));
    if (userRef.current) supabase.from("finance_transactions").update(toRow(t)).eq("id", t.id).then(({ error }) => reportError(error));
  }, []);
  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) }));
    if (userRef.current) supabase.from("finance_transactions").delete().eq("id", id).then(({ error }) => reportError(error));
  }, []);

  const value = useMemo<FinanceCtx>(
    () => ({
      ...state,
      ready,
      user,
      syncing,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      range,
      setRange,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addCategory: (c) => {
        const name = c.trim();
        if (!name || state.categories.some((x) => x.toLowerCase() === name.toLowerCase())) return false;
        const categories = [...state.categories, name];
        setState((s) => ({ ...s, categories }));
        saveSettings({ categories });
        return true;
      },
      setGoal: (goal) => {
        setState((s) => ({ ...s, goal }));
        saveSettings({ goal });
      },
      setCurrency: (currency) => {
        setState((s) => ({ ...s, currency }));
        saveSettings({ currency });
      },
      setTheme: (theme) => {
        setState((s) => ({ ...s, theme }));
        saveSettings({ theme });
      },
      setPalette: (palette) => {
        setState((s) => ({ ...s, palette }));
        saveSettings({ palette });
      },
      setBudget: (category, limit) => {
        const budgets = { ...state.budgets };
        if (limit == null || limit <= 0) delete budgets[category];
        else budgets[category] = limit;
        setState((s) => ({ ...s, budgets }));
        saveSettings({ budgets });
      },
      clearSample: () => {
        setState((s) => ({ ...s, transactions: s.transactions.filter((t) => !t.sample) }));
        const u = userRef.current;
        if (u) supabase.from("finance_transactions").delete().eq("user_id", u.id).eq("sample", true).then(({ error }) => reportError(error));
      },
      hasSample: state.transactions.some((t) => t.sample),
      money: (n) => formatMoney(n, state.currency),
    }),
    [state, ready, user, syncing, range, addTransactions, updateTransaction, deleteTransaction, saveSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinance must be used inside FinanceProvider");
  return c;
}
