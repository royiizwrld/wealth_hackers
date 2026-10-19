import { useEffect, useState } from "react";
import { ArrowRightLeft, ArrowUpDown, History, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { CURRENCIES } from "@/lib/finance";

type Entry = { id: string; at: string; amount: number; from: string; to: string; rate: number; result: number; note?: string };
const KEY = "fintrack:fx-history";

function loadHistory(): Entry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Entry[]; } catch { return []; }
}
const fmt = (n: number, code: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`;

function CurrencySelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function ConverterTool({ showHistory = false }: { showHistory?: boolean }) {
  const f = useFinance();
  const [from, setFrom] = useState(f.currency === "USD" ? "EUR" : "USD");
  const [to, setTo] = useState(f.currency);
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);
  const persist = (h: Entry[]) => { setHistory(h); localStorage.setItem(KEY, JSON.stringify(h)); };

  useEffect(() => {
    if (from === to) { setRate(1); setStatus("idle"); return; }
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/rates?base=${from}`)
      .then((r) => r.json())
      .then((d: { rates?: Record<string, number> }) => {
        if (cancelled) return;
        const r = d.rates?.[to];
        if (typeof r === "number") { setRate(r); setStatus("idle"); } else { setRate(null); setStatus("error"); }
      })
      .catch(() => { if (!cancelled) { setRate(null); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [from, to]);

  const n = Number(amount);
  const result = rate != null && Number.isFinite(n) ? n * rate : null;

  const save = () => {
    if (result == null || rate == null || !(n > 0)) return;
    const e: Entry = { id: crypto.randomUUID(), at: new Date().toISOString(), amount: n, from, to, rate, result, ...(note.trim() ? { note: note.trim() } : {}) };
    persist([e, ...history].slice(0, 50));
    setNote("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input type="number" min="0" step="0.01" aria-label="Amount to convert" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <CurrencySelect value={from} onChange={setFrom} label="From currency" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" aria-label="Swap currencies" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowUpDown className="mr-1 h-4 w-4" /> Swap
        </Button>
        <CurrencySelect value={to} onChange={setTo} label="To currency" />
      </div>
      <div className="rounded-xl bg-muted p-3">
        {status === "loading" && <p className="text-sm text-muted-foreground">Loading today's rate…</p>}
        {status === "error" && <p className="text-sm text-destructive">Couldn't load the rate right now. Try again shortly.</p>}
        {status === "idle" && result != null && (
          <>
            <p className="text-2xl font-semibold">{fmt(result, to)}</p>
            <p className="text-xs text-muted-foreground">1 {from} ≈ {rate!.toFixed(4)} {to} · 1 {to} ≈ {(1 / rate!).toFixed(4)} {from}</p>
          </>
        )}
      </div>
      {showHistory && (
        <>
          <div className="flex gap-2">
            <Input placeholder="Note (e.g. Hotel in Dubai)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={save} disabled={result == null || !(n > 0)}>Save</Button>
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-sm font-medium"><History className="h-4 w-4" /> History</p>
              {history.length > 0 && <Button variant="ghost" size="sm" onClick={() => persist([])}>Clear</Button>}
            </div>
            {history.length === 0 && <p className="text-sm text-muted-foreground">Saved conversions appear here. They aren't added to your transactions.</p>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{fmt(h.amount, h.from)} → {fmt(h.result, h.to)}</p>
                  <p className="truncate text-xs text-muted-foreground">{new Date(h.at).toLocaleString()} · rate {h.rate.toFixed(4)}{h.note ? ` · ${h.note}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Delete entry" onClick={() => persist(history.filter((x) => x.id !== h.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CurrencyConverter() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="h-4 w-4" /> Currency converter</CardTitle>
      </CardHeader>
      <CardContent><ConverterTool /></CardContent>
    </Card>
  );
}
