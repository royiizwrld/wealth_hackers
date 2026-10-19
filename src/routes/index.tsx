import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/hooks/use-finance";
import { byMonth, inRange, monthKey, spendingByCategory, todayISO, totals } from "@/lib/finance";
import { CategoryDonut, MonthlyBars, RecentList, SavingsGoalCard, SummaryCards } from "@/components/dashboard/DashboardWidgets";
import { DateRangeInputs } from "@/components/DateRangeInputs";
import { CurrencyConverter } from "@/components/dashboard/CurrencyConverter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Wealth Hackers" },
      { name: "description", content: "Your monthly income, expenses, savings goal and spending charts at a glance." },
      { property: "og:title", content: "Dashboard — Wealth Hackers" },
      { property: "og:description", content: "Your monthly income, expenses, savings goal and spending charts at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, range, ready } = useFinance();
  const [month, setMonth] = useState(monthKey(todayISO()));
  const monthTx = useMemo(() => transactions.filter((t) => monthKey(t.date) === month), [transactions, month]);
  const ranged = useMemo(() => transactions.filter((t) => inRange(t, range)), [transactions, range]);
  const sum = totals(monthTx);
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">How your money moved this month.</p>
        </div>
        <Input type="month" aria-label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 w-auto" />
      </div>
      <SummaryCards {...sum} />
      <div className="grid gap-4 lg:grid-cols-3">
        <SavingsGoalCard net={sum.net} />
        <CurrencyConverter />
        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-2 p-5">
            <p className="text-sm font-medium">Chart date range</p>
            <DateRangeInputs />
            <p className="text-xs text-muted-foreground">Leave blank to show all time. Also applies to the Transactions page.</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDonut data={spendingByCategory(ranged)} />
        <MonthlyBars data={byMonth(ranged)} />
      </div>
      <BudgetProgress month={month} />
      <RecentList items={recent} />
    </div>
  );
}
