import { Input } from "@/components/ui/input";
import { useFinance } from "@/hooks/use-finance";

export function DateRangeInputs() {
  const { range, setRange } = useFinance();
  return (
    <div className="flex items-center gap-2 text-sm">
      <Input type="date" aria-label="From date" value={range.from ?? ""} onChange={(e) => setRange({ ...range, from: e.target.value || undefined })} className="h-9 w-auto" />
      <span className="text-muted-foreground">to</span>
      <Input type="date" aria-label="To date" value={range.to ?? ""} onChange={(e) => setRange({ ...range, to: e.target.value || undefined })} className="h-9 w-auto" />
    </div>
  );
}
