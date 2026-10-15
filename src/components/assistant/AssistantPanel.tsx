import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, History, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/hooks/use-finance";
import { buildSummary, uid } from "@/lib/finance";

interface Msg { role: "user" | "assistant"; content: string }
interface Thread { id: string; title: string; updatedAt: number; messages: Msg[] }

const KEY = "fintrack:chats";
const STARTERS = [
  "Where did I overspend this month?",
  "How much did I spend on food vs. last month?",
  "Am I on track for my savings goal?",
  "Suggest 3 ways to cut spending.",
];

export function AssistantPanel() {
  const fin = useFinance();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let list: Thread[] = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { /* ignore */ }
    if (!list.length) list = [{ id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] }];
    setThreads(list);
    setActiveId(list[0]!.id);
  }, []);

  const save = (list: Thread[]) => {
    setThreads(list);
    localStorage.setItem(KEY, JSON.stringify(list));
  };

  const active = threads.find((t) => t.id === activeId);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [active?.messages, loading]);
  useEffect(() => { if (open && !showHistory) setTimeout(() => inputRef.current?.focus(), 50); }, [open, showHistory, activeId, loading]);

  const newChat = () => {
    const t: Thread = { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
    save([t, ...threads]);
    setActiveId(t.id);
    setShowHistory(false);
    setError("");
  };

  const send = async (text: string) => {
    if (!text.trim() || loading || !active) return;
    setError("");
    setInput("");
    const id = active.id;
    const msgs: Msg[] = [...active.messages, { role: "user", content: text.trim() }];
    let list = threads.map((t) =>
      t.id === id ? { ...t, messages: msgs, updatedAt: Date.now(), title: t.messages.length ? t.title : text.slice(0, 40) } : t,
    );
    save(list);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs,
          summary: buildSummary(fin.transactions, fin.goal, fin.currency, fin.categories),
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Something went wrong. Please try again.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        list = list.map((t) => (t.id === id ? { ...t, messages: [...msgs, { role: "assistant", content: acc }] } : t));
        setThreads(list);
      }
      save(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (!active) return;
    save(threads.map((t) => (t.id === active.id ? { ...t, messages: [], title: "New chat" } : t)));
    setError("");
  };

  const deleteThread = (id: string) => {
    let list = threads.filter((t) => t.id !== id);
    if (!list.length) list = [{ id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] }];
    save(list);
    if (id === activeId) setActiveId(list[0]!.id);
  };

  const last = active?.messages[active.messages.length - 1];
  const typing = loading && last?.role === "user";

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        aria-label="Open finance assistant"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-xl"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden">
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 font-display">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Bot className="h-4 w-4" />
              </span>
              Coach Penny
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Chat history" onClick={() => setShowHistory((v) => !v)}>
                <History className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="New chat" onClick={newChat}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Chat history</p>
              {[...threads].sort((a, b) => b.updatedAt - a.updatedAt).map((t) => (
                <div key={t.id} className={`mb-1 flex items-center gap-1 rounded-lg ${t.id === activeId ? "bg-secondary" : "hover:bg-muted"}`}>
                  <button
                    className="flex-1 truncate px-3 py-2 text-left text-sm"
                    onClick={() => { setActiveId(t.id); setShowHistory(false); setError(""); }}
                  >
                    {t.title || "New chat"}
                    <span className="block text-xs text-muted-foreground">
                      {t.messages.length} messages · {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <Button variant="ghost" size="icon" aria-label="Delete chat" onClick={() => deleteThread(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {!active?.messages.length && (
                  <div className="space-y-3 pt-6 text-center">
                    <p className="font-display text-lg">Ask about your money</p>
                    <p className="text-sm text-muted-foreground">I only use the data in your tracker.</p>
                    <div className="grid gap-2 pt-2">
                      {STARTERS.map((s) => (
                        <button key={s} onClick={() => send(s)} className="rounded-xl border bg-card px-3 py-2 text-left text-sm hover:bg-secondary">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {active?.messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="prose-chat max-w-full text-sm">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ),
                )}
                {typing && (
                  <div className="flex gap-1 py-2" aria-label="Assistant is typing">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                )}
                {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
                <div ref={endRef} />
              </div>
              <div className="border-t p-3">
                <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    placeholder="Ask about your spending…"
                    rows={1}
                    className="max-h-32 min-h-10 resize-none"
                  />
                  <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>General guidance, not financial advice.</span>
                  <button onClick={clearChat} className="underline-offset-2 hover:underline">Clear chat</button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
