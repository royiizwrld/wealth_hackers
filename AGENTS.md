<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All finance data (transactions, categories, goal, currency, theme) lives in localStorage via the single `FinanceProvider`/`useFinance` in src/hooks/use-finance.tsx — one storage owner avoids drift.
- AI calls go through TanStack server routes `src/routes/api/chat.ts` (streamed text) and `src/routes/api/parse.ts` (JSON extraction) using `src/lib/ai.server.ts` — keeps the gateway key server-side.
- Pure finance logic (totals, CSV, duplicates, AI row parsing) lives in src/lib and is unit-tested in src/test/finance.test.ts.
