import { createOpenAI } from "@ai-sdk/openai";

export const MODEL = "openai/gpt-6-astra";

export function getProvider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

export const responseOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

export function friendlyError(err: unknown): { status: number; message: string } {
  const e = err as { statusCode?: number; status?: number; message?: string };
  const status = e?.statusCode ?? e?.status ?? 500;
  if (status === 429) return { status, message: "The assistant is busy right now. Please wait a moment and try again." };
  if (status === 402) return { status, message: "AI credits have run out for this workspace. Please add credits to continue." };
  if (status === 403) return { status, message: "AI access is currently blocked for this workspace." };
  return { status: 500, message: "Something went wrong talking to the AI. Please try again." };
}
