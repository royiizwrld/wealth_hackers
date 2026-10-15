import { createFileRoute } from "@tanstack/react-router";
import { streamText, type UserContent } from "ai";
import { friendlyError, getProvider, MODEL, responseOptions } from "@/lib/ai.server";

export const Route = createFileRoute("/api/parse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: string; image?: string; categories: string[]; today: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        const instructions = `Extract financial transactions from the user's input (bank statement lines, M-Pesa/mobile-money SMS, receipts, CSV rows or casual notes).
Today's date is ${body.today}. Resolve relative dates ("yesterday", "on the 1st", "last Friday") against today. If no date is given, use today and mark confidence "low".
Map each to exactly one of these categories: ${body.categories.join(", ")}. Use "Other" if unclear.
type is "income" for money received (salary, received from, deposit) and "expense" otherwise. Amount must be a positive number without currency symbols.
For a receipt, produce one transaction for the total unless items are clearly separate purchases.
Set confidence "low" with a short reason when the amount, date, type or category is ambiguous.
Respond with ONLY JSON of the form {"transactions":[{"date":"YYYY-MM-DD","amount":0,"type":"expense","category":"Food","note":"","confidence":"high","reason":""}]}. No markdown.`;
        const content: UserContent = [];
        if (body.text) content.push({ type: "text", text: body.text.slice(0, 20000) });
        if (body.image) content.push({ type: "image", image: body.image });
        if (!content.length) return Response.json({ error: "Nothing to analyze" }, { status: 400 });
        try {
          const openai = getProvider();
          const result = streamText({
            model: openai.responses(MODEL),
            system: instructions,
            messages: [{ role: "user", content }],
            providerOptions: responseOptions,
          });
          const text = await result.text;
          return Response.json({ raw: text });
        } catch (err) {
          const f = friendlyError(err);
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
    },
  },
});
