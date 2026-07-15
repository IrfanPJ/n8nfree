import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  colorClassName = "text-foreground",
  sub,
}: {
  label: string;
  value: string | number;
  colorClassName?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className={cn("text-2xl font-bold font-mono tabular-nums", colorClassName)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
