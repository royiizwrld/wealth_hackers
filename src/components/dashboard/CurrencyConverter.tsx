import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { CURRENCIES } from "@/lib/finance";

export function CurrencyConverter() {
  const f = useFinance();
  const [from, setFrom] = useState(f.currency === "USD" ? "EUR" : "USD");
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (from === f.currency) { setRate(1); setStatus("idle"); return; }
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/rates?base=${from}`)
      .then((r) => r.json())
      .then((d: { rates?: Record<string, number> }) => {
        if (cancelled) return;
        const r = d.rates?.[f.currency];
        if (typeof r === "number") { setRate(r); setStatus("idle"); } else { setRate(null); setStatus("error"); }
      })
      .catch(() => { if (!cancelled) { setRate(null); setStatus("error"); } });
    return () => { cancelled = true; };
  }, [from, f.currency]);

  const n = Number(amount);
  const result = rate != null && Number.isFinite(n) ? n * rate : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="h-4 w-4" /> Currency converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input type="number" min="0" step="0.01" aria-label="Amount to convert" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="w-28" aria-label="From currency"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl bg-muted p-3">
          {status === "loading" && <p className="text-sm text-muted-foreground">Loading today's rate…</p>}
          {status === "error" && <p className="text-sm text-destructive">Couldn't load the rate right now. Try again shortly.</p>}
          {status === "idle" && result != null && (
            <>
              <p className="text-2xl font-semibold">{f.money(result)}</p>
              <p className="text-xs text-muted-foreground">1 {from} ≈ {rate!.toFixed(4)} {f.currency} · today's live rate</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
