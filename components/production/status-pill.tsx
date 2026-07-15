import { cn } from "@/lib/utils";
import type { ProductionOrderStatus } from "@/types/production";

// green = delivered/ready, blue = in production/dispatched,
// amber = on hold/pending, red = delayed/return/cancelled
const STATUS_STYLES: Record<ProductionOrderStatus, string> = {
  "DELIVERED":            "bg-green-500/10 text-green-400 border-green-500/20",
  "READY FOR DELIVERY":   "bg-green-500/10 text-green-400 border-green-500/20",
  "READY FOR DISPATCH":   "bg-green-500/10 text-green-400 border-green-500/20",
  "TRIAL READY":          "bg-green-500/10 text-green-400 border-green-500/20",
  "IN PRODUCTION":        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "DISPATCHED":           "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "NEXT IN LINE":         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "TRIAL COMPLETED":      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "ON HOLD":              "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "PENDING":              "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "CUTTING NOT RECEIVED": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "RETURN ITEMS":         "bg-red-500/10 text-red-400 border-red-500/20",
  "CANCELLED":            "bg-red-500/10 text-red-400 border-red-500/20",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status as ProductionOrderStatus] ?? "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
