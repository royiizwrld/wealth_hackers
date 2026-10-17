import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFinance } from "@/hooks/use-finance";
import { monthKey, todayISO } from "@/lib/finance";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Budgets — Wealth Hackers" },
      { name: "description", content: "Set monthly budget limits per category and get alerts when you overspend." },
      { property: "og:title", content: "Budgets — Wealth Hackers" },
      { property: "og:description", content: "Set monthly budget limits per category and get alerts when you overspend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const f = useFinance();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const month = monthKey(todayISO());

  const spent = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of f.transactions) {
      if (t.type === "expense" && monthKey(t.date) === month) {
        map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      }
    }
    return map;
  }, [f.transactions, month]);

  const budgeted = f.categories.filter((c) => f.budgets[c] != null);
  const unbudgeted = f.categories.filter((c) => f.budgets[c] == null);

  const save = (category: string) => {
    const raw = (drafts[category] ?? "").trim();
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0) {
      f.setBudget(category, null);
      toast.success(`Budget removed for ${category}`);
    } else {
      f.setBudget(category, Math.round(n * 100) / 100);
      toast.success(`Budget for ${category} set to ${f.money(n)}`);
    }
    setDrafts((d) => ({ ...d, [category]: "" }));
  };

  const row = (category: string) => {
    const limit = f.budgets[category] ?? 0;
    const used = spent.get(category) ?? 0;
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    const over = limit > 0 && used > limit;
    const warn = limit > 0 && !over && pct >= 80;
    return (
      <div key={category} className="space-y-2 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{category}</span>
          <span className="text-sm text-muted-foreground">
            {f.money(used)} of {f.money(limit)}
          </span>
        </div>
        <Progress value={Math.min(pct, 100)} className={over ? "[&>div]:bg-destructive" : warn ? "[&>div]:bg-expense" : ""} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`flex items-center gap-1 text-xs ${over ? "font-medium text-destructive" : warn ? "font-medium text-expense" : "text-muted-foreground"}`}>
            {over && <><AlertTriangle className="h-3.5 w-3.5" /> Over budget by {f.money(used - limit)}</>}
            {warn && <><AlertTriangle className="h-3.5 w-3.5" /> {Math.round(pct)}% used — nearing limit</>}
            {!over && !warn && (limit > 0 ? `${Math.round(pct)}% used` : "No spending yet")}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={String(limit)}
              value={drafts[category] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [category]: e.target.value }))}
              className="h-8 w-28 text-sm"
            />
            <Button size="sm" variant="outline" onClick={() => save(category)}>Save</Button>
            <Button size="icon" variant="ghost" aria-label={`Remove ${category} budget`} onClick={() => { f.setBudget(category, null); toast.success(`Budget removed for ${category}`); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">Monthly limits per category for {month}. You get a warning at 80% and an alert when you go over.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Active budgets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {budgeted.length === 0 && <p className="text-sm text-muted-foreground">No budgets yet — add one below.</p>}
          {budgeted.map(row)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Add a budget</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {unbudgeted.length === 0 && <p className="text-sm text-muted-foreground">Every category has a budget.</p>}
          {unbudgeted.map((category) => (
            <div key={category} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <span className="font-medium">{category}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Monthly limit"
                  value={drafts[category] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [category]: e.target.value }))}
                  className="h-8 w-32 text-sm"
                />
                <Button size="sm" onClick={() => save(category)}>Set</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
