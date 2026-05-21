"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar,
  User2,
  ChevronRight,
  AlertCircle,
  Clock,
  IndianRupee,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderStatusBadge, PriorityBadge } from "./order-status-badge";
import { updateOrderStatus } from "@/actions/orders";
import type { OrderWithRelations, OrderStatus } from "@/types";
import { ORDER_STATUS_CONFIG, formatCurrency, formatDate, cn } from "@/lib/utils";

type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
const statusConfig = (s: OrderStatus) => ORDER_STATUS_CONFIG[s as StatusKey];

const KANBAN_COLUMNS: OrderStatus[] = [
  "PENDING",
  "MEASURING",
  "CUTTING",
  "STITCHING",
  "TRIAL",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  MEASURING: <Package className="w-3.5 h-3.5" />,
  CUTTING: <Package className="w-3.5 h-3.5" />,
  STITCHING: <Package className="w-3.5 h-3.5" />,
  TRIAL: <User2 className="w-3.5 h-3.5" />,
  READY: <Package className="w-3.5 h-3.5" />,
  DELIVERED: <Package className="w-3.5 h-3.5" />,
  CANCELLED: <AlertCircle className="w-3.5 h-3.5" />,
};

interface MoveOrderDialogProps {
  order: OrderWithRelations | null;
  onClose: () => void;
  onMoved: (orderId: string, newStatus: OrderStatus, notes?: string) => void;
}

function MoveOrderDialog({ order, onClose, onMoved }: MoveOrderDialogProps) {
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMove = () => {
    if (!order || !targetStatus) return;
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, targetStatus, notes || undefined);
      if (result.success) {
        toast.success(`Order moved to ${statusConfig(targetStatus as OrderStatus).label}`);
        onMoved(order.id, targetStatus as OrderStatus, notes || undefined);
        onClose();
      } else {
        toast.error(result.error ?? "Failed to update status");
      }
    });
  };

  const validTransitions = getValidTransitions(order?.status as OrderStatus);

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Move Order</DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm font-semibold text-[#D4AF37]">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.customer.name} · {order.garmentType}
              </p>
              <div className="mt-2">
                <OrderStatusBadge status={order.status} size="sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Move to Status</Label>
              <Select
                value={targetStatus}
                onValueChange={(v) => setTargetStatus(v as OrderStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  {validTransitions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig(status).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Add a note about this status change..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                onClick={handleMove}
                disabled={!targetStatus || isPending}
                loading={isPending}
              >
                Move Order
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
  const flow: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["MEASURING", "CUTTING", "CANCELLED"],
    MEASURING: ["CUTTING", "PENDING", "CANCELLED"],
    CUTTING: ["STITCHING", "MEASURING", "CANCELLED"],
    STITCHING: ["TRIAL", "CUTTING", "CANCELLED"],
    TRIAL: ["READY", "STITCHING", "CANCELLED"],
    READY: ["DELIVERED", "TRIAL", "CANCELLED"],
    DELIVERED: ["READY"],
    CANCELLED: ["PENDING"],
  };
  return flow[currentStatus] ?? [];
}

interface OrderKanbanCardProps {
  order: OrderWithRelations;
  onMoveClick: (order: OrderWithRelations) => void;
}

function OrderKanbanCard({ order, onMoveClick }: OrderKanbanCardProps) {
  const isOverdue =
    order.deliveryDate &&
    new Date(order.deliveryDate) < new Date() &&
    !["DELIVERED", "CANCELLED"].includes(order.status);

  const balanceDue = order.totalAmount - order.advanceAmount;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group p-3 rounded-xl border bg-card hover:border-[#D4AF37]/40 transition-all cursor-pointer shadow-sm hover:shadow-md",
        order.priority === "URGENT"
          ? "border-red-400/30"
          : order.priority === "HIGH"
          ? "border-yellow-400/20"
          : "border-border"
      )}
      onClick={() => onMoveClick(order)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#D4AF37] truncate leading-none">
            {order.orderNumber}
          </p>
          <p className="text-sm font-medium truncate mt-0.5">{order.customer.name}</p>
        </div>
        <PriorityBadge priority={order.priority} />
      </div>

      {/* Garment */}
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
        <Package className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{order.garmentType}</span>
        {order.fabricColor && (
          <span className="truncate text-foreground/60">· {order.fabricColor}</span>
        )}
      </p>

      {/* Delivery */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs mb-2",
          isOverdue ? "text-red-400" : "text-muted-foreground"
        )}
      >
        <Calendar className="w-3 h-3 flex-shrink-0" />
        <span>{formatDate(order.deliveryDate)}</span>
        {isOverdue && (
          <AlertCircle className="w-3 h-3 text-red-400 ml-auto" aria-label="Overdue" />
        )}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <IndianRupee className="w-3 h-3 flex-shrink-0" />
        <span>{formatCurrency(order.totalAmount)}</span>
        {balanceDue > 0 && (
          <span className="text-yellow-400 ml-auto">
            {formatCurrency(balanceDue)} due
          </span>
        )}
      </div>

      {/* Assigned To */}
      {order.assignedTo && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{order.assignedTo.name}</span>
        </div>
      )}

      {/* Move hint */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-3 h-3 text-[#D4AF37]" />
        <span className="text-[10px] text-[#D4AF37] font-medium">Click to move</span>
      </div>
    </motion.div>
  );
}

interface KanbanColumnProps {
  status: OrderStatus;
  orders: OrderWithRelations[];
  onMoveClick: (order: OrderWithRelations) => void;
}

function KanbanColumn({ status, orders, onMoveClick }: KanbanColumnProps) {
  const config = statusConfig(status);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col rounded-xl border border-border bg-secondary/20 overflow-hidden">
      {/* Column header */}
      <div className={cn("px-3 py-2.5 border-b border-border flex items-center justify-between")}>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-xs font-semibold", config.color)}>
            {STATUS_ICONS[status]}
            {config.label}
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            config.bg,
            config.color
          )}
        >
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
        <div className="p-2 space-y-2">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-2", config.bg)}>
                <span className={cn("text-sm", config.color)}>{STATUS_ICONS[status]}</span>
              </div>
              <p className="text-xs text-muted-foreground">No orders</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {orders.map((order) => (
                <OrderKanbanCard
                  key={order.id}
                  order={order}
                  onMoveClick={onMoveClick}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface OrderKanbanProps {
  initialOrders: OrderWithRelations[];
  visibleStatuses?: OrderStatus[];
}

export function OrderKanban({
  initialOrders,
  visibleStatuses = KANBAN_COLUMNS,
}: OrderKanbanProps) {
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const [movingOrder, setMovingOrder] = useState<OrderWithRelations | null>(null);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<OrderStatus, OrderWithRelations[]> = {
      PENDING: [],
      MEASURING: [],
      CUTTING: [],
      STITCHING: [],
      TRIAL: [],
      READY: [],
      DELIVERED: [],
      CANCELLED: [],
    };
    for (const order of orders) {
      if (map[order.status]) {
        map[order.status].push(order);
      }
    }
    return map;
  }, [orders]);

  const handleMoved = (
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              statusHistory: [
                {
                  id: `temp-${Date.now()}`,
                  orderId,
                  status: newStatus,
                  notes: notes ?? null,
                  changedBy: null,
                  changedAt: new Date(),
                },
                ...o.statusHistory,
              ],
            }
          : o
      )
    );
  };

  const totalActive = orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        {visibleStatuses.map((status) => {
          const count = ordersByStatus[status].length;
          const config = statusConfig(status);
          return (
            <div
              key={status}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                config.bg,
                config.border,
                config.color
              )}
            >
              {STATUS_ICONS[status]}
              <span className="font-semibold">{count}</span>
              <span className="opacity-70">{config.label}</span>
            </div>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground">
          {totalActive} active orders
        </span>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {visibleStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              orders={ordersByStatus[status]}
              onMoveClick={setMovingOrder}
            />
          ))}
        </div>
      </div>

      {/* Move Dialog */}
      <MoveOrderDialog
        order={movingOrder}
        onClose={() => setMovingOrder(null)}
        onMoved={handleMoved}
      />
    </div>
  );
}
