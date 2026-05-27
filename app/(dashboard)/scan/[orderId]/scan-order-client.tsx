"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { processOrderScan, POSITION_STAGE_MAP, ALL_STAGES } from "@/actions/scan";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { cn, ORDER_STATUS_CONFIG, formatDate, formatCurrency } from "@/lib/utils";
import type { OrderWithRelations, OrderStatus } from "@/types";
import {
  CheckCircle2, ChevronRight, User2, Calendar, Package, ArrowRight, ScanLine,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => [k, (v as any).label])
);

interface ScanOrderClientProps {
  order: OrderWithRelations;
  allowedStages: OrderStatus[];
  userPosition: string | null;
  userName: string;
  userRole: string;
}

export function ScanOrderClient({
  order,
  allowedStages,
  userPosition,
  userName,
  userRole,
}: ScanOrderClientProps) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<OrderStatus | null>(
    allowedStages.length === 1 ? allowedStages[0] : null
  );
  const [done, setDone] = useState<{ newStatus: OrderStatus; orderNumber: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!selectedStage) { toast.error("Select a stage first"); return; }
    startTransition(async () => {
      const result = await processOrderScan(order.id, selectedStage);
      if (result.success) {
        setDone({ newStatus: selectedStage, orderNumber: order.orderNumber });
        toast.success(result.message ?? "Order updated");
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  };

  // ── Success screen ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 px-4">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-[#D4AF37]">{done.orderNumber}</p>
          <p className="text-sm text-muted-foreground">Stage updated successfully</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <OrderStatusBadge status={order.status} />
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <OrderStatusBadge status={done.newStatus} />
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            variant="gold"
            onClick={() => { setDone(null); setSelectedStage(allowedStages.length === 1 ? allowedStages[0] : null); router.push("/scan"); }}
            className="gap-2"
          >
            <ScanLine className="w-4 h-4" />
            Scan Next Order
          </Button>
          <Button variant="outline" onClick={() => router.push("/orders")}>
            View All Orders
          </Button>
        </div>
      </div>
    );
  }

  // ── No permissions screen ───────────────────────────────────────
  if (allowedStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-4">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <User2 className="w-8 h-8 text-yellow-400" />
        </div>
        <p className="text-lg font-semibold">No stage assigned to your position</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your position ({userPosition ?? "none"}) has no workflow stages configured. Ask your admin to assign a position.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  // ── Main scan confirmation screen ───────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Scanner identity */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
        <User2 className="w-3.5 h-3.5" />
        <span>{userName}</span>
        {userPosition && (
          <>
            <span className="opacity-40">·</span>
            <span className="text-[#D4AF37]">{userPosition.replace(/_/g, " ")}</span>
          </>
        )}
      </div>

      {/* Order card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xl font-bold text-[#D4AF37] tracking-wider">{order.orderNumber}</p>
            <p className="text-base font-semibold mt-0.5">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">{order.garmentType}</p>
          </div>
          <OrderStatusBadge status={order.status} size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Delivery: {formatDate(order.deliveryDate)}</span>
          </div>
          {order.items && order.items.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="w-3.5 h-3.5" />
              <span>{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Items list */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-1 border-t border-border pt-3">
            {order.items.map((item, i) => (
              <div key={item.id ?? i} className="flex justify-between text-xs text-muted-foreground">
                <span>{item.garmentType} {item.quantity > 1 ? `×${item.quantity}` : ""}</span>
                {item.unitPrice > 0 && <span>{formatCurrency(item.unitPrice * item.quantity)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage selection */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          {allowedStages.length === 1 ? "Advance to" : "Select stage to set"}
        </p>
        <div className="space-y-2">
          {allowedStages.map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium",
                selectedStage === stage
                  ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                  : "border-border bg-card hover:bg-secondary/40"
              )}
            >
              <span>{STATUS_LABELS[stage] ?? stage}</span>
              {selectedStage === stage && <CheckCircle2 className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* Current status note */}
      <p className="text-xs text-center text-muted-foreground">
        Current stage: <span className="font-medium">{STATUS_LABELS[order.status] ?? order.status}</span>
      </p>

      {/* Confirm */}
      <Button
        variant="gold"
        size="lg"
        className="w-full gap-2 text-base"
        disabled={!selectedStage || isPending}
        loading={isPending}
        onClick={handleConfirm}
      >
        <ChevronRight className="w-5 h-5" />
        Confirm Stage Update
      </Button>
    </div>
  );
}
