# Pocket Pal Finance

Build a responsive Personal Finance & Expense Tracker web app with a clean, modern design (card-based layout, light/dark mode, mobile-friendly, currency formatted consistently).

DASHBOARD

- Summary cards: Total Income, Total Expenses, Net Savings (current month, with a month selector).

- Monthly savings goal: user can set a target amount; show a progress bar with percentage and amount remaining.

- Charts (Recharts): a donut/pie chart of spending by category, and a bar chart of income vs. expenses by month.

- A "Recent Transactions" list.

TRANSACTIONS

- "Add Transaction" form: amount, date (default today), type (Income/Expense), category, optional note.

- Default categories: Food, Rent, Transport, Utilities, Entertainment, Health, Shopping, Salary, Other. Let users add custom categories.

- Transactions page with a table: edit, delete, sort by date/amount.

- Validate inputs (positive amounts, required fields) and show toast confirmations.

DATA

- Persist everything in localStorage (transactions, categories, savings goal) so it survives refresh.

- Seed with a small set of sample data on first load, with a "Clear sample data" button.

Keep the code organized: separate components, a shared Transaction type, and a single data hook/context for storage.                                                                                                                    On the Transactions page, add filters for category (multi-select), type, date range, and a text search on notes. Show a "Clear filters" button and a count of matching results. Make the dashboard charts respect the selected date range. Add an "Export CSV" button that downloads the currently filtered transactions (columns: date, type, category, amount, note).                                                                                                                                                                    Add an AI finance assistant as a floating chat button that opens a side panel on every page.

BEHAVIOR

- The assistant answers questions about the user's own data, e.g. "Where did I overspend this month?", "How much did I spend on food vs. last month?", "Am I on track for my savings goal?", "Suggest 3 ways to cut spending."

- On each message, send the AI a compact summary of the user's data (totals by category by month, savings goal, recent transactions) plus the chat history.

- System prompt: the assistant is a friendly, practical personal finance coach. It uses only the data provided, never invents numbers, says so if data is missing, keeps answers concise, and offers general guidance, not professional financial advice.

- Stream responses, render markdown, and include 3-4 suggested starter questions in an empty chat.

- Add a "Clear chat" button and a loading/typing indicator.

IMPLEMENTATION

- Use Lovable Cloud with an edge function to call the AI model so no API key is exposed in the browser. Handle errors and rate limits with a friendly message.                                         Add a "Smart Bulk Entry" feature on the Transactions page.

- A large text area where the user can paste messy text: bank statement lines, M-Pesa or mobile-money messages, receipts, or plain notes like "lunch 450, uber 800 yesterday, salary 85000 on the 1st".

- Also allow uploading a CSV or an image of a receipt.

- On "Analyze", send the input to the AI (via the same edge function) and ask it to return structured JSON: an array of transactions with date, amount, type, category (mapped to existing categories), and note. Interpret relative dates ("yesterday") using today's date.

- Show the results in an editable preview table where each row can be corrected, deleted, or have its category changed. Flag low-confidence or ambiguous rows in a highlight color, and flag possible duplicates of existing transactions.

- A "Confirm & Save" button adds the approved rows to the transaction list. Nothing is saved until the user confirms.

- Handle errors gracefully if the AI returns invalid JSON.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2b6e67c8-bc20-45e8-bf7a-5c26f5ef1458).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
