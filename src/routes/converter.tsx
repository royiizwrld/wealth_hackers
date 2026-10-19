import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { ConverterTool } from "@/components/dashboard/CurrencyConverter";

export const Route = createFileRoute("/converter")({
  head: () => ({
    meta: [
      { title: "Currency Converter — Wealth Hackers" },
      { name: "description", content: "Convert foreign amounts at today's live rate, swap currencies and keep a history." },
      { property: "og:title", content: "Currency Converter — Wealth Hackers" },
      { property: "og:description", content: "Convert foreign amounts at today's live rate, swap currencies and keep a history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Currency converter</h1>
        <p className="text-sm text-muted-foreground">Track foreign prices without creating a transaction.</p>
      </div>
      <Card><CardContent className="p-5"><ConverterTool showHistory /></CardContent></Card>
    </div>
  ),
});
