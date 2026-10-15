import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpDown, ChevronDown, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/hooks/use-finance";
import { inRange, toCSV } from "@/lib/finance";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { BulkEntry } from "@/components/transactions/BulkEntry";
import { DateRangeInputs } from "@/components/DateRangeInputs";
import type { Transaction } from "@/types/finance";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Pocketwise" },
      { name: "description", content: "Add, filter, edit and export your income and expense transactions." },
      { property: "og:title", content: "Transactions — Pocketwise" },
      { property: "og:description", content: "Add, filter, edit and export your income and expense transactions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { transactions, categories, deleteTransaction, money, range, setRange } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [sort, setSort] = useState<{ key: "date" | "amount"; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [cats, setCats] = useState<string[]>([]);
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return transactions
      .filter((t) => inRange(t, range))
      .filter((t) => !cats.length || cats.includes(t.category))
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => !s || (t.note ?? "").toLowerCase().includes(s))
      .sort((a, b) => (sort.key === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount) * sort.dir);
  }, [transactions, range, cats, type, q, sort]);

  const hasFilters = cats.length > 0 || type !== "all" || q || range.from || range.to;
  const clear = () => { setCats([]); setType("all"); setQ(""); setRange({}); };
  const toggleSort = (key: "date" | "amount") => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));

  const exportCSV = () => {
    const blob = new Blob([toCSV(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">Everything you've earned and spent.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add transaction</Button>
        </div>
      </div>

      <BulkEntry />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-48 pl-8" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  {cats.length ? `${cats.length} categories` : "All categories"} <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                {categories.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={cats.includes(c)} onCheckedChange={(v) => setCats((p) => (v ? [...p, c] : p.filter((x) => x !== c)))} />
                    {c}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <DateRangeInputs />
            {hasFilters && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} of {transactions.length} transactions</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><button className="flex items-center gap-1" onClick={() => toggleSort("date")}>Date <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right"><button className="ml-auto flex items-center gap-1" onClick={() => toggleSort("amount")}>Amount <ArrowUpDown className="h-3 w-3" /></button></TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No matching transactions.</TableCell></TableRow>
                )}
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap tabular">{t.date}</TableCell>
                    <TableCell><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t.category}</span></TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">{t.note}</TableCell>
                    <TableCell className={`whitespace-nowrap text-right font-medium tabular ${t.type === "income" ? "text-income" : "text-expense"}`}>
                      {t.type === "income" ? "+" : "−"}{money(t.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => { deleteTransaction(t.id); toast.success("Transaction deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}
