import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { todayISO } from "@/lib/finance";
import type { Transaction, TransactionType } from "@/types/finance";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction | null;
}

export function TransactionForm({ open, onOpenChange, editing }: Props) {
  const { categories, addTransactions, updateTransaction, addCategory } = useFinance();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [newCat, setNewCat] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAmount(editing ? String(editing.amount) : "");
    setDate(editing?.date ?? todayISO());
    setType(editing?.type ?? "expense");
    setCategory(editing?.category ?? "");
    setNote(editing?.note ?? "");
    setErrors({});
  }, [open, editing]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    const errs: Record<string, string> = {};
    if (!amount || !Number.isFinite(n) || n <= 0) errs.amount = "Enter a positive amount";
    if (!date) errs.date = "Date is required";
    if (!category) errs.category = "Pick a category";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = { amount: Math.round(n * 100) / 100, date, type, category, note: note.trim() || undefined };
    if (editing) {
      updateTransaction({ ...editing, ...data });
      toast.success("Transaction updated");
    } else {
      addTransactions([data]);
      toast.success("Transaction added");
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
              <Label htmlFor="amount">Amount</Label>
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
