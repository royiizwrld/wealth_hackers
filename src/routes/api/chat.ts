import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { friendlyError, getProvider, MODEL, responseOptions } from "@/lib/ai.server";

const SYSTEM = `You are a friendly, practical personal finance coach inside an expense tracker app.
Rules:
- Use ONLY the user's data provided in the DATA block. Never invent or estimate numbers that are not derivable from it.
- If the data needed to answer is missing, say so clearly and suggest what the user could record.
- Keep answers concise (short paragraphs or bullet lists), use the user's currency, and format amounts clearly.
- Offer general guidance only, not professional financial advice.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages: { role: "user" | "assistant"; content: string }[]; summary: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        try {
          const openai = getProvider();
          const messages: ModelMessage[] = body.messages
            .slice(-30)
            .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
          const result = streamText({
            model: openai.responses(MODEL),
            system: `${SYSTEM}\n\nDATA:\n${JSON.stringify(body.summary)}`,
            messages,
            providerOptions: responseOptions,
            abortSignal: request.signal,
          });
          const it = result.fullStream[Symbol.asyncIterator]();
          // Wait for the first text (or an error) so failures return a proper status.
          let first = "";
          for (;;) {
            const { value, done } = await it.next();
            if (done) break;
            if (value.type === "error") throw value.error;
            if (value.type === "text-delta") {
              first = value.text;
              break;
            }
          }
          const enc = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              if (first) controller.enqueue(enc.encode(first));
              try {
                for (;;) {
                  const { value, done } = await it.next();
                  if (done) break;
                  if (value.type === "text-delta") controller.enqueue(enc.encode(value.text));
                  if (value.type === "error") throw value.error;
                }
              } catch {
                controller.enqueue(enc.encode("\n\n_The response was interrupted. Please try again._"));
              }
              controller.close();
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
        } catch (err) {
          const f = friendlyError(err);
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
    },
  },
});
