import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { DateRange, Transaction } from "@/types/finance";
import { DEFAULT_CATEGORIES, formatMoney, uid } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { dedupeForImport, readLegacyLocal, LEGACY_KEY } from "@/lib/local-import";

export type ThemePref = "light" | "dark" | "system";

interface Stored {
  transactions: Transaction[];
  categories: string[];
  goal: number;
  currency: string;
  theme: ThemePref;
  palette: string;
  budgets: Record<string, number>;
  firstName: string;
  lastName: string | null;
  aiEnabled: boolean;
  inactivityMinutes: number;
}

interface FinanceCtx extends Stored {
  ready: boolean;
  user: User | null;
  syncing: boolean;
  loadError: boolean;
  reload: () => void;
  signOut: () => Promise<void>;
  range: DateRange;
  setRange: (r: DateRange) => void;
  /** Saves all rows in one batch: either every row is saved or none. */
  addTransactions: (t: Omit<Transaction, "id">[]) => Promise<boolean>;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: string) => boolean;
  removeCategory: (c: string) => void;
  setGoal: (n: number) => void;
  setCurrency: (c: string) => void;
  setTheme: (t: ThemePref) => void;
  setPalette: (p: string) => void;
  setBudget: (category: string, limit: number | null) => void;
  updateProfile: (p: { firstName?: string; lastName?: string | null; aiEnabled?: boolean; inactivityMinutes?: number }) => void;
  privacy: boolean;
  setPrivacy: (v: boolean) => void;
  pendingImport: Transaction[];
  importLocal: () => Promise<void>;
  skipImport: () => void;
  money: (n: number) => string;
}

const Ctx = createContext<FinanceCtx | null>(null);

const initial: Stored = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  goal: 0,
  currency: "KES",
  theme: "system",
  palette: "default",
  budgets: {},
  firstName: "",
  lastName: null,
  aiEnabled: true,
  inactivityMinutes: 15,
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
};

const toRow = (t: Transaction) => ({
  id: t.id,
  amount: t.amount,
  date: t.date,
  type: t.type,
  category: t.category,
  note: t.note ? t.note.slice(0, 500) : null,
  original_amount: t.originalAmount ?? null,
  original_currency: t.originalCurrency ?? null,
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
});

const PRIVACY_KEY = "fintrack:privacy";

function failToast(what: string, retry: () => void) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  toast.error(offline ? `You're offline — couldn't save ${what}.` : `Couldn't save ${what}. Please try again.`, {
    action: { label: "Retry", onClick: retry },
  });
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(initial);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<DateRange>({});
  const [privacy, setPrivacyState] = useState(false);
  const [pendingImport, setPendingImport] = useState<Transaction[]>([]);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setPrivacyState(localStorage.getItem(PRIVACY_KEY) === "1");
  }, []);
  const setPrivacy = useCallback((v: boolean) => {
    setPrivacyState(v);
    localStorage.setItem(PRIVACY_KEY, v ? "1" : "0");
  }, []);

  const loadFor = useCallback(async (u: User | null) => {
    if (!u) {
      setState(initial);
      setPendingImport([]);
      setReady(true);
      return;
    }
    setSyncing(true);
    setLoadError(false);
    const [p, c, t] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("categories").select("name").order("created_at"),
      supabase.from("finance_transactions").select("id,amount,date,type,category,note,original_amount,original_currency").order("date", { ascending: false }).limit(10000),
    ]);
    if (p.error || c.error || t.error) {
      setLoadError(true);
      setSyncing(false);
      setReady(true);
      return;
    }
    const prof = p.data;
    const txs = (t.data ?? []).map((r) => fromRow(r as TxRow));
    setState({
      transactions: txs,
      categories: c.data?.length ? c.data.map((x) => x.name) : DEFAULT_CATEGORIES,
      goal: Number(prof?.monthly_savings_goal ?? 0),
      currency: prof?.currency ?? "KES",
      theme: (prof?.theme as ThemePref) ?? "system",
      palette: prof?.palette ?? "default",
      budgets: (prof?.budgets as Record<string, number>) ?? {},
      firstName: prof?.first_name ?? "",
      lastName: prof?.last_name ?? null,
      aiEnabled: prof?.ai_data_enabled ?? true,
      inactivityMinutes: prof?.inactivity_minutes ?? 15,
    });
    // One-time import of data saved on this device before accounts existed.
    if (localStorage.getItem(`fintrack:import-skipped:${u.id}`) !== "1") {
      const local = readLegacyLocal();
      setPendingImport(dedupeForImport(local, txs));
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
      if ((u?.id ?? null) === current) {
        if (u) setUser(u);
        return;
      }
      current = u?.id ?? null;
      setUser(u);
      setReady(false);
      loadFor(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadFor]);

  // Theme: light / dark / follow system
  useEffect(() => {
    const el = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => el.classList.toggle("dark", state.theme === "dark" || (state.theme === "system" && mq.matches));
    apply();
    el.dataset["palette"] = state.palette;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.theme, state.palette]);

  const saveProfile = useCallback((patch: Record<string, unknown>, rollback: Partial<Stored>, what: string) => {
    const u = userRef.current;
    if (!u) return;
    const run = () =>
      supabase.from("profiles").update(patch as never).eq("id", u.id).then(({ error }) => {
        if (error) {
          setState((s) => ({ ...s, ...rollback }));
          failToast(what, () => {
            setState((s) => ({ ...s, ...Object.fromEntries(Object.entries(patch)) } as Stored));
            run();
          });
        }
      });
    run();
  }, []);

  const addTransactions = useCallback(async (list: Omit<Transaction, "id">[]): Promise<boolean> => {
    const u = userRef.current;
    if (!u || !list.length) return false;
    const withIds = list.map((t) => ({ ...t, id: uid() }));
    setState((s) => ({ ...s, transactions: [...withIds, ...s.transactions] }));
    const { error } = await supabase.from("finance_transactions").insert(withIds.map((t) => ({ ...toRow(t), user_id: u.id })));
    if (error) {
      const ids = new Set(withIds.map((t) => t.id));
      setState((s) => ({ ...s, transactions: s.transactions.filter((t) => !ids.has(t.id)) }));
      failToast(list.length > 1 ? `${list.length} transactions (none were saved)` : "the transaction", () => {
        addTransactions(list).then((ok) => ok && toast.success("Saved"));
      });
      return false;
    }
    return true;
  }, []);

  const updateTransaction = useCallback((t: Transaction) => {
    const prev = stateRef.current.transactions.find((x) => x.id === t.id);
    setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === t.id ? t : x)) }));
    supabase.from("finance_transactions").update(toRow(t) as never).eq("id", t.id).then(({ error }) => {
      if (error && prev) {
        setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === t.id ? prev : x)) }));
        failToast("your changes", () => updateTransaction(t));
      }
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    const prev = stateRef.current.transactions;
    setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) }));
    supabase.from("finance_transactions").delete().eq("id", id).then(({ error }) => {
      if (error) {
        setState((s) => ({ ...s, transactions: prev }));
        failToast("the deletion", () => deleteTransaction(id));
      }
    });
  }, []);

  const importLocal = useCallback(async () => {
    const u = userRef.current;
    if (!u || !pendingImport.length) return;
    const existing = new Set(stateRef.current.categories.map((c) => c.toLowerCase()));
    const missing = [...new Set(pendingImport.map((t) => t.category))].filter((c) => !existing.has(c.toLowerCase()));
    if (missing.length) {
      const { error } = await supabase.from("categories").insert(missing.map((name) => ({ name, user_id: u.id })));
      if (error) { failToast("the import", () => importLocal()); return; }
      setState((s) => ({ ...s, categories: [...s.categories, ...missing] }));
    }
    const ok = await addTransactions(pendingImport.map(({ id: _id, sample: _s, ...rest }) => rest));
    if (ok) {
      localStorage.removeItem(LEGACY_KEY);
      await supabase.from("activity_log").insert({ event: "data_import", device: navigator.userAgent.slice(0, 300) });
      toast.success(`Imported ${pendingImport.length} transactions to your account`);
      setPendingImport([]);
    }
  }, [pendingImport, addTransactions]);

  const skipImport = useCallback(() => {
    const u = userRef.current;
    if (u) localStorage.setItem(`fintrack:import-skipped:${u.id}`, "1");
    setPendingImport([]);
  }, []);

  const value = useMemo<FinanceCtx>(
    () => ({
      ...state,
      ready,
      user,
      syncing,
      loadError,
      reload: () => loadFor(userRef.current),
      signOut: async () => {
        const u = userRef.current;
        if (u) await supabase.from("activity_log").insert({ event: "sign_out", device: navigator.userAgent.slice(0, 300) });
        await supabase.auth.signOut();
      },
      range,
      setRange,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addCategory: (c) => {
        const name = c.trim().slice(0, 40);
        const u = userRef.current;
        if (!u || !name || state.categories.some((x) => x.toLowerCase() === name.toLowerCase())) return false;
        setState((s) => ({ ...s, categories: [...s.categories, name] }));
        supabase.from("categories").insert({ name, user_id: u.id }).then(({ error }) => {
          if (error) {
            setState((s) => ({ ...s, categories: s.categories.filter((x) => x !== name) }));
            failToast("the category", () => {});
          }
        });
        return true;
      },
      removeCategory: (c) => {
        if (state.transactions.some((t) => t.category === c)) {
          toast.error("This category is used by transactions, so it can't be removed.");
          return;
        }
        const prev = state.categories;
        setState((s) => ({ ...s, categories: s.categories.filter((x) => x !== c) }));
        supabase.from("categories").delete().eq("name", c).then(({ error }) => {
          if (error) { setState((s) => ({ ...s, categories: prev })); failToast("the category change", () => {}); }
        });
      },
      setGoal: (goal) => {
        const prev = state.goal;
        setState((s) => ({ ...s, goal }));
        saveProfile({ monthly_savings_goal: goal }, { goal: prev }, "your savings goal");
      },
      setCurrency: (currency) => {
        const prev = state.currency;
        setState((s) => ({ ...s, currency }));
        saveProfile({ currency }, { currency: prev }, "your currency");
      },
      setTheme: (theme) => {
        const prev = state.theme;
        setState((s) => ({ ...s, theme }));
        saveProfile({ theme }, { theme: prev }, "your theme");
      },
      setPalette: (palette) => {
        const prev = state.palette;
        setState((s) => ({ ...s, palette }));
        saveProfile({ palette }, { palette: prev }, "your theme");
      },
      setBudget: (category, limit) => {
        const prev = state.budgets;
        const budgets = { ...state.budgets };
        if (limit == null || limit <= 0) delete budgets[category];
        else budgets[category] = limit;
        setState((s) => ({ ...s, budgets }));
        saveProfile({ budgets }, { budgets: prev }, "your budget");
      },
      updateProfile: (p) => {
        const patch: Record<string, unknown> = {};
        const rollback: Partial<Stored> = {};
        if (p.firstName !== undefined) { patch["first_name"] = p.firstName.trim().slice(0, 60); rollback.firstName = state.firstName; }
        if (p.lastName !== undefined) { patch["last_name"] = p.lastName?.trim().slice(0, 60) || null; rollback.lastName = state.lastName; }
        if (p.aiEnabled !== undefined) { patch["ai_data_enabled"] = p.aiEnabled; rollback.aiEnabled = state.aiEnabled; }
        if (p.inactivityMinutes !== undefined) { patch["inactivity_minutes"] = p.inactivityMinutes; rollback.inactivityMinutes = state.inactivityMinutes; }
        setState((s) => ({
          ...s,
          ...(p.firstName !== undefined && { firstName: String(patch["first_name"]) }),
          ...(p.lastName !== undefined && { lastName: (patch["last_name"] as string | null) }),
          ...(p.aiEnabled !== undefined && { aiEnabled: p.aiEnabled }),
          ...(p.inactivityMinutes !== undefined && { inactivityMinutes: p.inactivityMinutes }),
        }));
        saveProfile(patch, rollback, "your profile");
      },
      privacy,
      setPrivacy,
      pendingImport,
      importLocal,
      skipImport,
      money: (n) => (privacy ? "•••••" : formatMoney(n, state.currency)),
    }),
    [state, ready, user, syncing, loadError, range, addTransactions, updateTransaction, deleteTransaction, saveProfile, loadFor, privacy, setPrivacy, pendingImport, importLocal, skipImport],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinance must be used inside FinanceProvider");
  return c;
}
