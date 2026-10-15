import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/hooks/use-finance";
import type { Transaction } from "@/types/finance";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function SummaryCards({ income, expenses, net }: { income: number; expenses: number; net: number }) {
  const { money } = useFinance();
  const items = [
    { label: "Total Income", value: income, icon: ArrowUpRight, tone: "text-income" },
    { label: "Total Expenses", value: expenses, icon: ArrowDownRight, tone: "text-expense" },
    { label: "Net Savings", value: net, icon: PiggyBank, tone: net >= 0 ? "text-income" : "text-expense" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {label}
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className={`mt-2 font-display text-2xl font-semibold tabular ${tone}`}>{money(value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SavingsGoalCard({ net }: { net: number }) {
  const { goal, setGoal, money } = useFinance();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(goal));
  const pct = goal > 0 ? Math.max(0, Math.min(100, (net / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - net);
  const save = () => {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a positive goal amount");
    setGoal(n);
    setEditing(false);
    toast.success("Savings goal updated");
  };
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> Monthly savings goal</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => { setVal(String(goal)); setEditing((v) => !v); }}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="flex gap-2">
            <Input type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} />
            <Button onClick={save}>Save</Button>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <span className="font-display text-xl font-semibold tabular">{money(Math.max(0, net))}</span>
              <span className="text-sm text-muted-foreground">of {money(goal)}</span>
            </div>
            <Progress value={pct} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">{pct.toFixed(0)}%</span>
              <span className="text-muted-foreground">{remaining > 0 ? `${money(remaining)} to go` : "Goal reached 🎉"}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryDonut({ data }: { data: { name: string; value: number }[] }) {
  const { money } = useFinance();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Spending by category</CardTitle></CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="pt-20 text-center text-sm text-muted-foreground">No expenses in this range.</p>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" />)}
              </Pie>
              <Tooltip formatter={(v: number) => money(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyBars({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  const { money } = useFinance();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Income vs. expenses</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={60} />
            <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Income" fill="var(--income)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--expense)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RecentList({ items }: { items: Transaction[] }) {
  const { money } = useFinance();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Recent transactions</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {items.length === 0 && <p className="py-4 text-sm text-muted-foreground">No transactions yet.</p>}
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{t.note || t.category}</p>
              <p className="text-xs text-muted-foreground">{t.category} · {t.date}</p>
            </div>
            <span className={`text-sm font-semibold tabular ${t.type === "income" ? "text-income" : "text-expense"}`}>
              {t.type === "income" ? "+" : "−"}{money(t.amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
