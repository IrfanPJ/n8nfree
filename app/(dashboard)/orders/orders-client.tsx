"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Eye,
  Calendar,
  User2,
  IndianRupee,
  Package,
  AlertCircle,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderForm } from "@/components/orders/order-form";
import { OrderStatusBadge, PriorityBadge } from "@/components/orders/order-status-badge";
import { OrderKanban } from "@/components/orders/order-kanban";
import { deleteOrder, updateOrderStatus } from "@/actions/orders";
import type { OrderWithRelations, PaginatedResult, OrderStatus } from "@/types";
import {
  formatCurrency,
  formatDate,
  debounce,
  cn,
  ORDER_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/lib/utils";

type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
const statusConfig = (s: OrderStatus) => ORDER_STATUS_CONFIG[s as StatusKey];

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "MEASURING",
  "CUTTING",
  "STITCHING",
  "TRIAL",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

interface OrdersClientProps {
  initialData: PaginatedResult<OrderWithRelations>;
  initialView?: "table" | "kanban";
}

export function OrdersClient({
  initialData,
  initialView = "table",
}: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<"table" | "kanban">(initialView);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<OrderWithRelations | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderWithRelations | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce((...args: unknown[]) => {
      const value = args[0] as string;
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("search", value);
      else params.delete("search");
      params.set("page", "1");
      router.push(`/orders?${params.toString()}`);
    }, 400),
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`/orders?${params.toString()}`);
  };

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/orders?${params.toString()}`);
  };

  const handleDelete = async (order: OrderWithRelations) => {
    if (
      !confirm(
        `Delete order "${order.orderNumber}"? This cannot be undone.`
      )
    )
      return;
    setDeletingId(order.id);
    const result = await deleteOrder(order.id);
    if (result.success) {
      toast.success("Order deleted");
      setData((prev) => ({
        ...prev,
        data: prev.data.filter((o) => o.id !== order.id),
        total: prev.total - 1,
      }));
    } else {
      toast.error(result.error ?? "Failed to delete order");
    }
    setDeletingId(null);
  };

  const handleStatusUpdate = async (
    order: OrderWithRelations,
    status: OrderStatus
  ) => {
    setStatusUpdating(order.id);
    const result = await updateOrderStatus(order.id, status);
    if (result.success) {
      toast.success(`Status updated to ${statusConfig(status).label}`);
      setData((prev) => ({
        ...prev,
        data: prev.data.map((o) =>
          o.id === order.id ? { ...o, status } : o
        ),
      }));
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
    setStatusUpdating(null);
  };

  const activeFilters = [
    searchParams.get("status"),
    searchParams.get("priority"),
  ].filter(Boolean);

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("priority");
    params.delete("search");
    params.set("page", "1");
    router.push(`/orders?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.total} total orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "table"
                  ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border",
                view === "kanban"
                  ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
          </div>

          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={searchParams.get("status") ?? "ALL"}
          onValueChange={(v) => handleFilterChange("status", v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusConfig(s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("priority") ?? "ALL"}
          onValueChange={(v) => handleFilterChange("priority", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {searchParams.get("status") && (
            <Badge
              variant="outline"
              className="text-xs gap-1.5 pr-1 cursor-pointer"
              onClick={() => handleFilterChange("status", null)}
            >
              Status: {statusConfig(searchParams.get("status") as OrderStatus)?.label}
              <X className="w-3 h-3" />
            </Badge>
          )}
          {searchParams.get("priority") && (
            <Badge
              variant="outline"
              className="text-xs gap-1.5 pr-1 cursor-pointer"
              onClick={() => handleFilterChange("priority", null)}
            >
              Priority: {PRIORITY_CONFIG[searchParams.get("priority") as keyof typeof PRIORITY_CONFIG]?.label}
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}

      {/* Content */}
      {view === "kanban" ? (
        <OrderKanban initialOrders={data.data} />
      ) : (
        <>
          {/* Table / List View */}
          {data.data.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Package className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No orders found</p>
              <p className="text-sm text-muted-foreground">
                {activeFilters.length > 0
                  ? "Try removing some filters"
                  : "Create your first order to get started"}
              </p>
              {activeFilters.length === 0 && (
                <Button variant="gold" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {data.data.map((order, i) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    index={i}
                    deletingId={deletingId}
                    statusUpdating={statusUpdating}
                    onView={() => setViewOrder(order)}
                    onEdit={() => setEditOrder(order)}
                    onDelete={() => handleDelete(order)}
                    onStatusUpdate={(status) => handleStatusUpdate(order, status)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages} · {data.total} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={data.page <= 1}
                  onClick={() => handlePage(data.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, idx) => {
                  const pageNum =
                    data.page <= 3
                      ? idx + 1
                      : data.page >= data.totalPages - 2
                      ? data.totalPages - 4 + idx
                      : data.page - 2 + idx;
                  if (pageNum < 1 || pageNum > data.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === data.page ? "gold" : "outline"}
                      size="icon-sm"
                      onClick={() => handlePage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => handlePage(data.page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <OrderForm
            onSuccess={(order) => {
              setCreateOpen(false);
              setData((prev) => ({
                ...prev,
                data: [order, ...prev.data].slice(0, prev.data.length),
                total: prev.total + 1,
              }));
              router.refresh();
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <OrderForm
              order={editOrder}
              onSuccess={(updated) => {
                setEditOrder(null);
                setData((prev) => ({
                  ...prev,
                  data: prev.data.map((o) => (o.id === updated.id ? updated : o)),
                }));
              }}
              onCancel={() => setEditOrder(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Order Details</span>
              {viewOrder && (
                <span className="text-[#D4AF37] text-sm font-normal">
                  {viewOrder.orderNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewOrder && <OrderDetailView order={viewOrder} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Order Row (Table View)
───────────────────────────────────────────── */
interface OrderRowProps {
  order: OrderWithRelations;
  index: number;
  deletingId: string | null;
  statusUpdating: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusUpdate: (status: OrderStatus) => void;
}

function OrderRow({
  order,
  index,
  deletingId,
  statusUpdating,
  onView,
  onEdit,
  onDelete,
  onStatusUpdate,
}: OrderRowProps) {
  const isOverdue =
    order.deliveryDate &&
    new Date(order.deliveryDate) < new Date() &&
    !["DELIVERED", "CANCELLED"].includes(order.status);

  const balanceDue = order.totalAmount - order.advanceAmount;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.025, 0.3) }}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-[#D4AF37]/30 transition-all",
        order.priority === "URGENT"
          ? "border-red-400/20"
          : order.priority === "HIGH"
          ? "border-yellow-400/10"
          : "border-border"
      )}
    >
      {/* Order Number & Customer */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onView}
            className="text-sm font-semibold text-[#D4AF37] hover:underline truncate leading-none"
          >
            {order.orderNumber}
          </button>
          <PriorityBadge priority={order.priority} />
          {isOverdue && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-semibold">
              <AlertCircle className="w-3 h-3" /> OVERDUE
            </span>
          )}
        </div>
        <p className="text-sm font-medium mt-0.5">{order.customer.name}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Package className="w-3 h-3" />
            {order.garmentType}
            {order.fabricName && ` · ${order.fabricName}`}
          </span>
          {order.assignedTo && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User2 className="w-3 h-3" />
              {order.assignedTo.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="hidden sm:flex flex-col items-start gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={statusUpdating === order.id}
              className="flex items-center gap-1 group/status"
            >
              <OrderStatusBadge status={order.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover/status:opacity-100 transition-opacity" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Change Status
            </div>
            <DropdownMenuSeparator />
            {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onStatusUpdate(s)}
                className={cn("text-xs", statusConfig(s).color)}
              >
                {statusConfig(s).label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dates */}
      <div className="hidden md:flex flex-col gap-1 text-xs text-muted-foreground min-w-[100px]">
        <span className={cn("flex items-center gap-1", isOverdue && "text-red-400")}>
          <Calendar className="w-3 h-3" />
          {formatDate(order.deliveryDate)}
        </span>
        {order.trialDate && (
          <span className="flex items-center gap-1 text-cyan-400/70">
            <Calendar className="w-3 h-3" />
            Trial: {formatDate(order.trialDate)}
          </span>
        )}
      </div>

      {/* Amount */}
      <div className="hidden lg:flex flex-col gap-1 text-xs min-w-[100px]">
        <span className="flex items-center gap-1 font-semibold">
          <IndianRupee className="w-3 h-3 text-muted-foreground" />
          {formatCurrency(order.totalAmount)}
        </span>
        {balanceDue > 0 ? (
          <span className="text-yellow-400">
            {formatCurrency(balanceDue)} due
          </span>
        ) : (
          <span className="text-green-400">Paid</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={onView}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={deletingId === order.id}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Order Detail View (inside Dialog)
───────────────────────────────────────────── */
function OrderDetailView({ order }: { order: OrderWithRelations }) {
  const balanceDue = order.totalAmount - order.advanceAmount;

  return (
    <div className="space-y-5">
      {/* Status & Priority */}
      <div className="flex items-center gap-3 flex-wrap">
        <OrderStatusBadge status={order.status} size="lg" />
        <PriorityBadge priority={order.priority} />
        {order.invoice && (
          <Badge variant="info" className="text-xs">
            Invoice #{order.invoice.invoiceNumber}
          </Badge>
        )}
      </div>

      {/* Customer & Assignment */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Customer</p>
          <p className="text-sm font-semibold">{order.customer.name}</p>
          {order.customer.phone && (
            <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
          )}
        </div>
        {order.assignedTo && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Assigned Tailor</p>
            <p className="text-sm font-semibold">{order.assignedTo.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {order.assignedTo.role?.toLowerCase()}
            </p>
          </div>
        )}
      </div>

      {/* Garment */}
      <div className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
        <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide">
          Garment Details
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Type</span>
            <p className="font-medium">{order.garmentType}</p>
          </div>
          {order.fabricName && (
            <div>
              <span className="text-xs text-muted-foreground">Fabric</span>
              <p className="font-medium">{order.fabricName}</p>
            </div>
          )}
          {order.fabricColor && (
            <div>
              <span className="text-xs text-muted-foreground">Color</span>
              <p className="font-medium">{order.fabricColor}</p>
            </div>
          )}
          {order.fabricQuantity && (
            <div>
              <span className="text-xs text-muted-foreground">Quantity</span>
              <p className="font-medium">{order.fabricQuantity} meters</p>
            </div>
          )}
        </div>
        {order.designNotes && (
          <div>
            <span className="text-xs text-muted-foreground">Design Notes</span>
            <p className="text-sm mt-0.5 leading-relaxed">{order.designNotes}</p>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg border border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Delivery Date
          </p>
          <p className="text-sm font-semibold">{formatDate(order.deliveryDate)}</p>
        </div>
        {order.trialDate && (
          <div className="p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5">
            <p className="text-xs text-cyan-400/80 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Trial Date
            </p>
            <p className="text-sm font-semibold">{formatDate(order.trialDate)}</p>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
        <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide">
          Payment
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Advance Paid</span>
          <span className="text-green-400 font-medium">
            {formatCurrency(order.advanceAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-border pt-2">
          <span className="font-medium">Balance Due</span>
          <span
            className={cn(
              "font-bold",
              balanceDue > 0 ? "text-yellow-400" : "text-green-400"
            )}
          >
            {balanceDue > 0 ? formatCurrency(balanceDue) : "Paid"}
          </span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm leading-relaxed">{order.notes}</p>
        </div>
      )}

      {/* Status History */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide">
            Status History
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {order.statusHistory.map((h: { id: string; status: OrderStatus; notes: string | null; changedAt: Date | string }) => (
              <div
                key={h.id}
                className="flex items-start gap-3 text-xs text-muted-foreground p-2 rounded-lg bg-secondary/20"
              >
                <OrderStatusBadge status={h.status} size="sm" />
                <div className="flex-1 min-w-0">
                  {h.notes && (
                    <p className="text-foreground/80 truncate">{h.notes}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatDate(h.changedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
