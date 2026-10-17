import { createFileRoute } from "@tanstack/react-router";

// Daily exchange rates, cached in-memory per base currency for 12 hours.
const cache = new Map<string, { at: number; rates: Record<string, number> }>();
const TTL = 12 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/rates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const base = (url.searchParams.get("base") ?? "KES").toUpperCase();
        if (!/^[A-Z]{3}$/.test(base)) {
          return Response.json({ error: "Invalid currency" }, { status: 400 });
        }
        const hit = cache.get(base);
        if (hit && Date.now() - hit.at < TTL) {
          return Response.json({ base, rates: hit.rates, date: new Date(hit.at).toISOString().slice(0, 10) });
        }
        try {
          const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
          const data = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
          if (data.result !== "success" || !data.rates) throw new Error("rate fetch failed");
          cache.set(base, { at: Date.now(), rates: data.rates });
          return Response.json({
            base,
            rates: data.rates,
            date: (data.time_last_update_utc ?? new Date().toISOString()).slice(0, 10),
          });
        } catch {
          return Response.json({ error: "Could not load exchange rates right now. Try again shortly." }, { status: 502 });
        }
      },
    },
  },
});
