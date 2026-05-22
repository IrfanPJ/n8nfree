"use client";

import React, { useState, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Calendar, User2, AlertCircle, Clock, DollarSign,
  Package, MessageCircle, Sparkles, GripVertical,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge, PriorityBadge } from "./order-status-badge";
import { BespokeDesigner } from "./bespoke-designer";
import { updateOrderStatus, updateOrderDesign } from "@/actions/orders";
import type { OrderWithRelations, OrderStatus } from "@/types";
import { ORDER_STATUS_CONFIG, formatCurrency, formatDate, cn, openWhatsApp } from "@/lib/utils";

const KANBAN_LABELS: Record<OrderStatus, string> = {
  PENDING: "Consultation", MEASURING: "Measuring", CUTTING: "Cutting",
  STITCHING: "Stitching", TRIAL: "Fitting", READY: "Ready",
  DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
const statusConfig = (s: OrderStatus) => ORDER_STATUS_CONFIG[s as StatusKey];

const KANBAN_COLUMNS: OrderStatus[] = [
  "PENDING", "MEASURING", "CUTTING", "STITCHING",
  "TRIAL", "READY", "DELIVERED", "CANCELLED",
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

/* ─── Move Dialog ─── */
function MoveOrderDialog({
  order, onClose, onMoved,
}: {
  order: OrderWithRelations | null;
  onClose: () => void;
  onMoved: (id: string, status: OrderStatus, notes?: string) => void;
}) {
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMove = () => {
    if (!order || !targetStatus) return;
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, targetStatus, notes || undefined);
      if (result.success) {
        toast.success(`Moved to ${statusConfig(targetStatus as OrderStatus).label}`);
        onMoved(order.id, targetStatus as OrderStatus, notes || undefined);
        onClose();
      } else {
        toast.error(result.error ?? "Failed to update status");
      }
    });
  };

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-base">Move Order</DialogTitle></DialogHeader>
        {order && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm font-semibold text-[#D4AF37]">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{order.customer.name} · {order.garmentType}</p>
              <div className="mt-2"><OrderStatusBadge status={order.status} size="sm" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Move to Status</Label>
              <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as OrderStatus)}>
                <SelectTrigger><SelectValue placeholder="Select new status..." /></SelectTrigger>
                <SelectContent>
                  {getValidTransitions(order.status).map((s) => (
                    <SelectItem key={s} value={s}>{statusConfig(s).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="Add a note..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
              <Button variant="gold" className="flex-1" onClick={handleMove} disabled={!targetStatus || isPending} loading={isPending}>
                Move Order
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Kanban Card ─── */
function OrderKanbanCard({
  order, isDragging, onMoveClick, onDesignClick, onDragStart, onDragEnd,
}: {
  order: OrderWithRelations;
  isDragging: boolean;
  onMoveClick: (o: OrderWithRelations) => void;
  onDesignClick: (o: OrderWithRelations) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const isOverdue =
    order.deliveryDate &&
    new Date(order.deliveryDate) < new Date() &&
    !["DELIVERED", "CANCELLED"].includes(order.status);
  const balanceDue = order.totalAmount - order.advanceAmount;

  return (
    /* Native div handles drag — keeps Framer Motion out of the event path */
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", order.id);
        onDragStart(order.id);
      }}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.35 : 1, transition: "opacity 0.15s" }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "group p-3 rounded-xl border bg-card hover:border-[#D4AF37]/40 transition-colors cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md select-none",
          order.priority === "URGENT" ? "border-red-400/30"
            : order.priority === "HIGH" ? "border-yellow-400/20"
            : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#D4AF37] truncate leading-none">{order.orderNumber}</p>
              <p className="text-sm font-medium truncate mt-0.5">{order.customer.name}</p>
            </div>
          </div>
          <PriorityBadge priority={order.priority} />
        </div>

        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Package className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{order.garmentType}</span>
          {order.fabricColor && <span className="truncate text-foreground/60">· {order.fabricColor}</span>}
        </p>

        <div className={cn("flex items-center gap-1.5 text-xs mb-2", isOverdue ? "text-red-400" : "text-muted-foreground")}>
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{formatDate(order.deliveryDate)}</span>
          {isOverdue && <AlertCircle className="w-3 h-3 ml-auto" />}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <DollarSign className="w-3 h-3 flex-shrink-0" />
          <span>{formatCurrency(order.totalAmount)}</span>
          {balanceDue > 0 && <span className="text-yellow-400 ml-auto">{formatCurrency(balanceDue)} due</span>}
        </div>

        {order.assignedTo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{order.assignedTo.name}</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={(e) => { e.stopPropagation(); onDesignClick(order); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-colors font-medium">
              <Sparkles className="w-3 h-3" /> Design
            </button>
            {order.customer.phone && (
              <button type="button" onClick={(e) => {
                e.stopPropagation();
                openWhatsApp(order.customer.phone, `Hello ${order.customer.name}, your order ${order.orderNumber} (${order.garmentType}) is in *${KANBAN_LABELS[order.status]}*. Delivery: ${formatDate(order.deliveryDate)}.`);
              }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium">
                <MessageCircle className="w-3 h-3" /> WA
              </button>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onMoveClick(order); }}
              className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors font-medium">
              Move →
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumn({
  status, orders, isDragActive, dragRef, onMoveClick, onDesignClick,
  onCardDragStart, onCardDragEnd, onDrop, draggedOrderId,
}: {
  status: OrderStatus;
  orders: OrderWithRelations[];
  isDragActive: boolean;
  dragRef: React.MutableRefObject<string | null>;
  onMoveClick: (o: OrderWithRelations) => void;
  onDesignClick: (o: OrderWithRelations) => void;
  onCardDragStart: (id: string) => void;
  onCardDragEnd: () => void;
  onDrop: (id: string, status: OrderStatus) => void;
  draggedOrderId: string | null;
}) {
  const config = statusConfig(status);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex-shrink-0 w-72 flex flex-col rounded-xl border transition-colors duration-150 overflow-hidden",
        isDragOver ? "border-[#D4AF37]/60 bg-[#D4AF37]/5"
          : isDragActive ? "border-border/60 bg-secondary/30"
          : "border-border bg-secondary/20"
      )}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDragOver(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        /* Use ref (always fresh) → fallback to dataTransfer → fallback to state */
        const id = dragRef.current ?? e.dataTransfer.getData("text/plain") ?? draggedOrderId;
        if (id) onDrop(id, status);
      }}
    >
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", config.color)}>
          {STATUS_ICONS[status]}{KANBAN_LABELS[status]}
        </span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", config.bg, config.color)}>
          {orders.length}
        </span>
      </div>

      {isDragActive && (
        <div className={cn(
          "mx-2 mt-2 h-8 rounded-lg border-2 border-dashed flex items-center justify-center text-xs transition-colors",
          isDragOver ? "border-[#D4AF37] text-[#D4AF37]" : "border-border/40 text-muted-foreground/40"
        )}>
          {isDragOver ? "Drop here" : "↓ drag here"}
        </div>
      )}

      <ScrollArea className="flex-1 max-h-[calc(100vh-300px)]">
        <div className="p-2 space-y-2">
          {orders.length === 0 && !isDragActive ? (
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
                  isDragging={draggedOrderId === order.id}
                  onMoveClick={onMoveClick}
                  onDesignClick={onDesignClick}
                  onDragStart={onCardDragStart}
                  onDragEnd={onCardDragEnd}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── OrderKanban ─── */
export function OrderKanban({
  initialOrders,
  visibleStatuses = KANBAN_COLUMNS,
}: {
  initialOrders: OrderWithRelations[];
  visibleStatuses?: OrderStatus[];
}) {
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const [movingOrder, setMovingOrder] = useState<OrderWithRelations | null>(null);
  const [designOrder, setDesignOrder] = useState<OrderWithRelations | null>(null);
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  /* Ref gives drop handlers a guaranteed-fresh id without stale closures */
  const dragRef = useRef<string | null>(null);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<OrderStatus, OrderWithRelations[]> = {
      PENDING: [], MEASURING: [], CUTTING: [], STITCHING: [],
      TRIAL: [], READY: [], DELIVERED: [], CANCELLED: [],
    };
    for (const o of orders) if (map[o.status]) map[o.status].push(o);
    return map;
  }, [orders]);

  const handleMoved = (orderId: string, newStatus: OrderStatus, notes?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: newStatus, statusHistory: [{ id: `tmp-${Date.now()}`, orderId, status: newStatus, notes: notes ?? null, changedBy: null, changedAt: new Date().toISOString() }, ...o.statusHistory] }
          : o
      )
    );
  };

  const handleDrop = async (orderId: string, targetStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: targetStatus } : o));

    const result = await updateOrderStatus(orderId, targetStatus);
    if (result.success) {
      toast.success(`Moved to ${statusConfig(targetStatus).label}`);
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: order.status } : o));
      toast.error(result.error ?? "Failed to move order");
    }
  };

  const startDrag = (id: string) => { dragRef.current = id; setDraggedOrderId(id); };
  const endDrag = () => { dragRef.current = null; setDraggedOrderId(null); };

  const totalActive = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {visibleStatuses.map((status) => {
          const count = ordersByStatus[status].length;
          const config = statusConfig(status);
          return (
            <div key={status} className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", config.bg, config.border, config.color)}>
              {STATUS_ICONS[status]}
              <span className="font-semibold">{count}</span>
              <span className="opacity-70">{config.label}</span>
            </div>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground">{totalActive} active · drag to move</span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {visibleStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              orders={ordersByStatus[status]}
              isDragActive={!!draggedOrderId}
              dragRef={dragRef}
              draggedOrderId={draggedOrderId}
              onMoveClick={setMovingOrder}
              onDesignClick={setDesignOrder}
              onCardDragStart={startDrag}
              onCardDragEnd={endDrag}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      <MoveOrderDialog order={movingOrder} onClose={() => setMovingOrder(null)} onMoved={handleMoved} />

      <BespokeDesigner
        open={!!designOrder}
        onClose={() => setDesignOrder(null)}
        orderId={designOrder?.id}
        orderNumber={designOrder?.orderNumber}
        onSave={async (_design, specText) => {
          if (!designOrder) return;
          await updateOrderDesign(designOrder.id, specText);
        }}
      />
    </div>
  );
}
