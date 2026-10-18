import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { CURRENCIES, monthKey, todayISO } from "@/lib/finance";
import type { Transaction, TransactionType } from "@/types/finance";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction | null;
}

export function TransactionForm({ open, onOpenChange, editing }: Props) {
  const f = useFinance();
  const { categories, addTransactions, updateTransaction, addCategory } = f;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [newCat, setNewCat] = useState("");
  const [payCurrency, setPayCurrency] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"amount" | "date" | "category", string>>>({});

  useEffect(() => {
    if (!open) return;
    setAmount(editing ? String(editing.originalAmount ?? editing.amount) : "");
    setDate(editing?.date ?? todayISO());
    setType(editing?.type ?? "expense");
    setCategory(editing?.category ?? "");
    setNote(editing?.note ?? "");
    setPayCurrency(editing?.originalCurrency ?? "");
    setRate(null);
    setErrors({});
  }, [open, editing]);

  // Fetch the live rate when a foreign currency is chosen.
  useEffect(() => {
    if (!payCurrency || payCurrency === f.currency) { setRate(null); return; }
    let cancelled = false;
    setRateLoading(true);
    fetch(`/api/rates?base=${payCurrency}`)
      .then((r) => r.json())
      .then((d: { rates?: Record<string, number> }) => {
        if (cancelled) return;
        const r = d.rates?.[f.currency];
        setRate(typeof r === "number" ? r : null);
        if (typeof r !== "number") toast.error(`No rate available for ${payCurrency} → ${f.currency}`);
      })
      .catch(() => !cancelled && toast.error("Could not load exchange rates right now"))
      .finally(() => !cancelled && setRateLoading(false));
    return () => { cancelled = true; };
  }, [payCurrency, f.currency]);

  const foreign = payCurrency && payCurrency !== f.currency && rate != null;
  const converted = foreign && amount && Number.isFinite(Number(amount))
    ? Math.round(Number(amount) * rate * 100) / 100
    : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    const errs: Partial<Record<"amount" | "date" | "category", string>> = {};
    if (!amount || !Number.isFinite(n) || n <= 0) errs.amount = "Enter a positive amount";
    if (payCurrency && payCurrency !== f.currency && rate == null && !rateLoading) errs.amount = `No exchange rate for ${payCurrency} — pick another currency or try again`;
    if (!date) errs.date = "Date is required";
    if (!category) errs.category = "Pick a category";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const isForeign = payCurrency && payCurrency !== f.currency && rate != null;
    const finalAmount = isForeign && rate != null ? Math.round(n * rate * 100) / 100 : Math.round(n * 100) / 100;
    const data = {
      amount: finalAmount,
      date,
      type,
      category,
      note: note.trim() || undefined,
      originalAmount: isForeign ? Math.round(n * 100) / 100 : undefined,
      originalCurrency: isForeign ? payCurrency : undefined,
    };
    if (editing) {
      updateTransaction({ ...editing, ...data });
      toast.success("Transaction updated");
    } else {
      addTransactions([data]);
      toast.success("Transaction added");
      const limit = f.budgets[category];
      if (type === "expense" && limit) {
        const m = monthKey(date);
        const spent = f.transactions
          .filter((t) => t.type === "expense" && t.category === category && monthKey(t.date) === m)
          .reduce((s, t) => s + t.amount, 0) + data.amount;
        if (spent > limit) toast.error(`Over budget: ${category} is at ${f.money(spent)} of ${f.money(limit)} this month`);
        else if (spent >= limit * 0.8) toast.warning(`Heads up: ${category} is at ${Math.round((spent / limit) * 100)}% of its monthly budget`);
      }
    }
    onOpenChange(false);
  };

  const createCategory = () => {
    if (addCategory(newCat)) {
      setCategory(newCat.trim());
      toast.success(`Category "${newCat.trim()}" added`);
      setNewCat("");
    } else toast.error("Category is empty or already exists");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg py-2 text-sm font-medium capitalize ${type === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount{foreign ? ` (${payCurrency})` : ` (${f.currency})`}</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Paid in another currency? (optional)</Label>
            <Select value={payCurrency || f.currency} onValueChange={setPayCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {rateLoading && <p className="text-xs text-muted-foreground">Loading today's rate…</p>}
            {converted != null && rate != null && (
              <p className="text-xs text-muted-foreground">
                = {f.money(converted)} at today's rate (1 {payCurrency} ≈ {rate.toFixed(4)} {f.currency})
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            <div className="flex gap-2 pt-1">
              <Input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-8 text-sm" />
              <Button type="button" variant="outline" size="sm" onClick={createCategory}>Add</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>
          <Button type="submit" className="w-full">{editing ? "Save changes" : "Add transaction"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
