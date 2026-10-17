import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { CURRENCIES, PALETTES, formatMoney } from "@/lib/finance";
import { Check } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wealth Hackers" },
      { name: "description", content: "Choose your currency, theme and manage categories and sample data." },
      { property: "og:title", content: "Settings — Wealth Hackers" },
      { property: "og:description", content: "Choose your currency, theme and manage categories and sample data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const f = useFinance();
  const [cat, setCat] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Currency</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={f.currency} onValueChange={(c) => { f.setCurrency(c); toast.success(`Currency set to ${c}`); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">Preview: {formatMoney(12345.5, f.currency)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <span className="font-medium">Dark mode</span>
          <Switch checked={f.theme === "dark"} onCheckedChange={(v) => f.setTheme(v ? "dark" : "light")} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {f.categories.map((c) => <span key={c} className="rounded-full bg-secondary px-3 py-1 text-sm">{c}</span>)}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (f.addCategory(cat)) { toast.success("Category added"); setCat(""); } else toast.error("Category is empty or already exists"); }}>
            <Input placeholder="New category" value={cat} onChange={(e) => setCat(e.target.value)} />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Sample data</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{f.hasSample ? "Example transactions are loaded so you can explore." : "No sample data left."}</p>
          <Button variant="destructive" disabled={!f.hasSample} onClick={() => { f.clearSample(); toast.success("Sample data cleared"); }}>Clear sample data</Button>
        </CardContent>
      </Card>
    </div>
  );
}
