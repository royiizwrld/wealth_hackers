import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Copy, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/hooks/use-finance";
import { findDuplicate, todayISO, uid } from "@/lib/finance";
import { parseAIRows } from "@/lib/parse-rows";
import type { ParsedRow } from "@/types/finance";
import { useVoiceTyping } from "@/hooks/use-voice-typing";
import { VoiceTypingButton, VoiceTypingStatus } from "@/components/VoiceTyping";

export function BulkEntry() {
  const { categories, transactions, addTransactions, money } = useFinance();
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const voice = useVoiceTyping((spoken) => setText((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${spoken}`));

  const onFile = (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    if (f.type.startsWith("image/")) {
      reader.onload = () => setImage(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      reader.onload = () => setText((t) => (t ? t + "\n" : "") + String(reader.result));
      reader.readAsText(f);
    }
  };

  const analyze = async () => {
    if (!text.trim() && !image) { toast.error("Paste some text or upload a file first"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image, categories, today: todayISO() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Analysis failed. Please try again.");
      const parsed = parseAIRows(j.raw, categories);
      if (!parsed) throw new Error("The AI returned something we couldn't read. Please try again or simplify the input.");
      if (!parsed.length) throw new Error("No transactions were found in that input.");
      setRows(parsed.map((r) => ({ ...r, id: uid() })));
      toast.success(`Found ${parsed.length} transaction${parsed.length > 1 ? "s" : ""} — review before saving`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const update = (id: string, patch: Partial<ParsedRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const confirm = () => {
    const bad = rows.find((r) => !(r.amount > 0) || !r.date || !r.category);
    if (bad) { toast.error("Each row needs a positive amount, date and category"); return; }
    addTransactions(rows.map((r) => ({ amount: r.amount, date: r.date, type: r.type, category: r.category, note: r.note || undefined })));
    toast.success(`Saved ${rows.length} transactions`);
    setRows([]);
    setText("");
    setImage(null);
    setFileName("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-accent-foreground" /> Smart bulk entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Paste bank lines, M-Pesa messages, receipts or notes, e.g. "lunch 450, uber 800 yesterday, salary 85000 on the 1st"'}
        />
        <div className="flex flex-wrap items-center gap-2">
          <VoiceTypingButton voice={voice} disabled={loading} />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload CSV or receipt image
            <input type="file" accept=".csv,text/csv,text/plain,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {fileName && (
            <span className="text-xs text-muted-foreground">
              {fileName} <button className="underline" onClick={() => { setImage(null); setFileName(""); }}>remove</button>
            </span>
          )}
          <Button className="ml-auto" onClick={analyze} disabled={loading || voice.listening}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze
          </Button>
        </div>
        <VoiceTypingStatus voice={voice} />
        {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        {rows.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warn" /> Needs review</span>
              <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> Possible duplicate</span>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr><th className="p-2">Date</th><th className="p-2">Type</th><th className="p-2">Category</th><th className="p-2">Amount</th><th className="p-2">Note</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const dup = findDuplicate(r, transactions);
                    const flagged = r.confidence === "low" || dup;
                    return (
                      <tr key={r.id} className={`border-t ${flagged ? "bg-warn text-warn-foreground" : ""}`}>
                        <td className="p-1.5"><Input type="date" value={r.date} onChange={(e) => update(r.id, { date: e.target.value })} className="h-8 min-w-32" /></td>
                        <td className="p-1.5">
                          <Select value={r.type} onValueChange={(v) => update(r.id, { type: v as ParsedRow["type"] })}>
                            <SelectTrigger className="h-8 min-w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Select value={r.category} onValueChange={(v) => update(r.id, { category: v })}>
                            <SelectTrigger className="h-8 min-w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-1.5"><Input type="number" min="0" value={r.amount} onChange={(e) => update(r.id, { amount: Number(e.target.value) })} className="h-8 min-w-24" /></td>
                        <td className="p-1.5">
                          <Input value={r.note} onChange={(e) => update(r.id, { note: e.target.value })} className="h-8 min-w-40" />
                          {(r.confidence === "low" || dup) && (
                            <p className="mt-1 flex items-center gap-1 text-xs">
                              {dup ? <Copy className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {dup ? `Possible duplicate of ${dup.date} ${money(dup.amount)}` : r.reason || "Low confidence"}
                            </p>
                          )}
                        </td>
                        <td className="p-1.5">
                          <Button variant="ghost" size="icon" aria-label="Remove row" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRows([])}>Discard</Button>
              <Button onClick={confirm}>Confirm &amp; Save ({rows.length})</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
