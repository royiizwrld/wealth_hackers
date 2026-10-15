# Personal Finance & Expense Tracker

## What you'll get
- **Dashboard**: Income / Expenses / Net Savings cards for a chosen month, savings goal with progress bar (percent + remaining), spending-by-category donut, income-vs-expenses bar chart by month, recent transactions. Charts follow a date-range picker.
- **Transactions page**: Add/edit form (amount, date defaulting to today, type, category, note), custom categories, sortable table (date/amount) with edit/delete, filters (category multi-select, type, date range, note search), match count, Clear filters, Export CSV of filtered rows (date, type, category, amount, note). Validation + toast confirmations.
- **Smart Bulk Entry** (on Transactions page): paste messy text (bank lines, M-Pesa SMS, notes), or upload CSV / receipt image -> Analyze -> editable preview table (edit, delete, change category), low-confidence rows and possible duplicates highlighted, Confirm & Save. Nothing saved until confirmed; friendly error if AI output is invalid.
- **AI finance assistant**: floating button on every page opens a side panel. Multiple saved chats with a history list (new chat, switch, delete), Clear chat, 4 starter questions, streamed markdown replies, typing indicator, friendly error/rate-limit messages. Coach uses only your data, never invents numbers, not professional advice.
- **Settings**: currency picker with ~17 options (KES default, USD, EUR, GBP, UGX, TZS, RWF, NGN, ZAR, GHS, INR, JPY, CNY, CAD, AUD, AED, CHF), light/dark toggle, Clear sample data.
- **Data**: everything (transactions, categories, goal, currency, chats) stored in the browser; sample data seeded on first load.

## Design
Card-based, mobile-friendly, distinctive palette (deep green/ink with warm accent), light + dark mode, consistent currency formatting via Intl.

## Technical details
- Routes: `/` dashboard, `/transactions`, `/settings`; assistant panel mounted in `__root`. Chat history kept in the panel (thread list), per-chat ids in localStorage.
- `src/types/finance.ts` shared Transaction/Category/Goal types; single `FinanceProvider` context + `useFinance` hook handles localStorage (read after hydration to avoid SSR mismatch).
- Components split: SummaryCards, SavingsGoal, CategoryDonut, MonthlyBars, RecentList, TransactionForm, TransactionTable, Filters, BulkEntry, AssistantPanel, CurrencySelect.
- Enable Lovable Cloud; AI via Lovable AI Gateway (default model) through server-side TanStack server route `/api/chat` (streaming, AI SDK + AI Elements UI) and a server function for bulk parsing with strict JSON schema output (supports image input). Client sends compact summary (category totals by month, goal, last ~20 transactions, today's date, categories) with each request. 429/402 mapped to friendly messages.
- Duplicate detection client-side: same date + amount (+ similar note) vs existing transactions.
- Unit tests for summaries, CSV export, and duplicate detection.
