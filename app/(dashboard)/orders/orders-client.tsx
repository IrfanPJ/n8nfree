"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Eye,
  Calendar,
  User2,
  Package,
  AlertCircle,
  ChevronDown,
  X,
  Printer,
  MessageCircle,
  Sparkles,
  Ruler,
  QrCode,
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
import { BespokeDesigner } from "@/components/orders/bespoke-designer";
import { OrderQRDialog } from "@/components/orders/order-qr-dialog";
import { deleteOrder, updateOrderStatus, updateOrderDesign } from "@/actions/orders";
import type { OrderWithRelations, PaginatedResult, OrderStatus, Measurement } from "@/types";
import {
  formatCurrency,
  formatDate,
  debounce,
  cn,
  ORDER_STATUS_CONFIG,
  PRIORITY_CONFIG,
  openWhatsApp,
} from "@/lib/utils";
import { format } from "date-fns";
import { getMeasurements, deleteMeasurement } from "@/actions/measurements";
import { MeasurementForm } from "@/components/measurements/measurement-form";

function printOrderSlip(order: OrderWithRelations) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  const statusMap: Record<string, string> = {
    MEASUREMENT: "Measurement", FABRIC_ORDERING: "Fabric Ordering", FABRIC_COLLECTED: "Fabric Collected",
    CUTTING: "Cutting", SEMI_STITCH: "Semi Stitch", TRIAL: "Trial",
    FINAL_STITCH: "Final Stitch", READY_FOR_DELIVERY: "Ready for Delivery",
    DELIVERED: "Delivered", PENDING_ALTERATION: "Pending Alteration",
    READY_FINAL_DELIVERY: "Ready Final Delivery", ORDER_CLOSED: "Order Closed",
  };
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Order Slip — ${order.orderNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
      .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 16px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 22px; color: #D4AF37; letter-spacing: 2px; }
      .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
      .order-id { text-align: center; font-size: 28px; font-weight: bold; color: #D4AF37; margin-bottom: 20px; }
      .section { margin-bottom: 16px; }
      .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin: 0 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
      .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
      .label { color: #666; }
      .value { font-weight: 600; }
      .highlight { color: #D4AF37; }
      .measurements { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .meas-item { background: #f9f9f9; border: 1px solid #eee; padding: 8px; border-radius: 6px; }
      .meas-item .meas-label { font-size: 10px; color: #999; }
      .meas-item .meas-val { font-size: 14px; font-weight: bold; }
      .notes-box { background: #f9f9f9; border: 1px solid #eee; padding: 10px; border-radius: 6px; font-size: 12px; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
      .signature-line { text-align: center; width: 40%; }
      .signature-line .line { border-top: 1px solid #ccc; padding-top: 6px; font-size: 11px; color: #999; }
      @media print { body { padding: 10px; } }
    </style>
  </head><body>
    <div class="header">
      <h1>HOUSE OF TAILORS</h1>
      <p>Workshop Order Slip</p>
    </div>
    <div class="order-id">${order.orderNumber}</div>

    <div class="section">
      <h3>Client Details</h3>
      <div class="row"><span class="label">Name</span><span class="value">${order.customer.name}</span></div>
      ${order.customer.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${order.customer.phone}</span></div>` : ""}
      ${order.customer.email ? `<div class="row"><span class="label">Email</span><span class="value">${order.customer.email}</span></div>` : ""}
    </div>

    <div class="section">
      <h3>Order Details</h3>
      <div class="row"><span class="label">Garment</span><span class="value">${order.garmentType}</span></div>
      <div class="row"><span class="label">Status</span><span class="value highlight">${statusMap[order.status] ?? order.status}</span></div>
      <div class="row"><span class="label">Order Date</span><span class="value">${new Date(order.orderDate).toLocaleDateString("en-AE")}</span></div>
      <div class="row"><span class="label">Delivery Date</span><span class="value highlight">${new Date(order.deliveryDate).toLocaleDateString("en-AE")}</span></div>
      ${order.trialDate ? `<div class="row"><span class="label">Trial Date</span><span class="value">${new Date(order.trialDate).toLocaleDateString("en-AE")}</span></div>` : ""}
      ${order.assignedTo ? `<div class="row"><span class="label">Tailor</span><span class="value">${order.assignedTo.name}</span></div>` : ""}
    </div>

    ${order.fabricName ? `<div class="section">
      <h3>Fabric</h3>
      <div class="row"><span class="label">Name</span><span class="value">${order.fabricName}</span></div>
      ${order.fabricColor ? `<div class="row"><span class="label">Colour</span><span class="value">${order.fabricColor}</span></div>` : ""}
      ${order.fabricCode ? `<div class="row"><span class="label">Code</span><span class="value">${order.fabricCode}</span></div>` : ""}
      ${order.fabricQuantity ? `<div class="row"><span class="label">Quantity</span><span class="value">${order.fabricQuantity}m</span></div>` : ""}
    </div>` : ""}

    ${order.designNotes ? `<div class="section">
      <h3>Design Notes</h3>
      <div class="notes-box">${order.designNotes}</div>
    </div>` : ""}

    <div class="section">
      <h3>Payment</h3>
      <div class="row"><span class="label">Total Amount</span><span class="value">AED ${order.totalAmount.toLocaleString("en-AE")}</span></div>
      <div class="row"><span class="label">Advance Paid</span><span class="value">AED ${order.advanceAmount.toLocaleString("en-AE")}</span></div>
      <div class="row"><span class="label">Balance Due</span><span class="value highlight">AED ${(order.totalAmount - order.advanceAmount).toLocaleString("en-AE")}</span></div>
    </div>

    ${order.notes ? `<div class="section">
      <h3>Notes</h3>
      <div class="notes-box">${order.notes}</div>
    </div>` : ""}

    <div class="signature-row">
      <div class="signature-line"><div class="line">Client Signature</div></div>
      <div class="signature-line"><div class="line">Tailor / Manager</div></div>
    </div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

type StatusKey = keyof typeof ORDER_STATUS_CONFIG;
const statusConfig = (s: OrderStatus) => ORDER_STATUS_CONFIG[s as StatusKey];

const ORDER_STATUSES: OrderStatus[] = [
  "MEASUREMENT",
  "FABRIC_ORDERING",
  "FABRIC_COLLECTED",
  "CUTTING",
  "SEMI_STITCH",
  "TRIAL",
  "FINAL_STITCH",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "PENDING_ALTERATION",
  "READY_FINAL_DELIVERY",
  "ORDER_CLOSED",
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
  const [designOrder, setDesignOrder] = useState<OrderWithRelations | null>(null);
  const [qrOrder, setQrOrder] = useState<OrderWithRelations | null>(null);

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
        <OrderKanban
          initialOrders={data.data}
          onStatusChange={(orderId, newStatus) =>
            setData((prev) => ({
              ...prev,
              data: prev.data.map((o) => o.id === orderId ? { ...o, status: newStatus } : o),
            }))
          }
        />
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
                {activeFilters.length > 0 ? "Try removing some filters" : "Create your first order to get started"}
              </p>
              {activeFilters.length === 0 && (
                <Button variant="gold" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />New Order
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Order</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 hidden md:table-cell">Garment</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 hidden sm:table-cell">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Delivery</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-3 hidden lg:table-cell">Amount</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {data.data.map((order, i) => (
                      <OrderTableRow
                        key={order.id}
                        order={order}
                        index={i}
                        deletingId={deletingId}
                        statusUpdating={statusUpdating}
                        onView={() => setViewOrder(order)}
                        onEdit={() => setEditOrder(order)}
                        onDelete={() => handleDelete(order)}
                        onDesign={() => setDesignOrder(order)}
                        onQR={() => setQrOrder(order)}
                        onStatusUpdate={(status) => handleStatusUpdate(order, status)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
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

      {/* Bespoke Designer */}
      <BespokeDesigner
        open={!!designOrder}
        onClose={() => setDesignOrder(null)}
        orderId={designOrder?.id}
        orderNumber={designOrder?.orderNumber}
        onSave={async (_design, specText) => {
          if (!designOrder) return;
          await updateOrderDesign(designOrder.id, specText);
          setData((prev) => ({
            ...prev,
            data: prev.data.map((o) =>
              o.id === designOrder.id ? { ...o, designNotes: specText } : o
            ),
          }));
        }}
      />

      {/* QR Code Dialog */}
      <OrderQRDialog
        open={!!qrOrder}
        onClose={() => setQrOrder(null)}
        orderId={qrOrder?.id ?? ""}
        orderNumber={qrOrder?.orderNumber ?? ""}
        customerName={qrOrder?.customer?.name ?? ""}
        garmentType={qrOrder?.garmentType ?? ""}
      />

      {/* View Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
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
          {viewOrder && <OrderDetailView order={viewOrder} onShowQR={() => { setViewOrder(null); setQrOrder(viewOrder); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Order Table Row
───────────────────────────────────────────── */
interface OrderRowProps {
  order: OrderWithRelations;
  index: number;
  deletingId: string | null;
  statusUpdating: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDesign: () => void;
  onQR: () => void;
  onStatusUpdate: (status: OrderStatus) => void;
}

function OrderTableRow({ order, index, deletingId, statusUpdating, onView, onEdit, onDelete, onDesign, onQR, onStatusUpdate }: OrderRowProps) {
  const isOverdue =
    order.deliveryDate &&
    new Date(order.deliveryDate) < new Date() &&
    !["DELIVERED", "ORDER_CLOSED"].includes(order.status);
  const balanceDue = order.totalAmount - order.advanceAmount;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="group border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
    >
      {/* Order # */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button onClick={onView} className="text-sm font-semibold text-[#D4AF37] hover:underline text-left">
            {order.orderNumber}
          </button>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={order.priority} />
            {isOverdue && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-semibold">
                <AlertCircle className="w-3 h-3" /> OVERDUE
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Customer */}
      <td className="px-3 py-3">
        <p className="text-sm font-medium">{order.customer.name}</p>
        {order.assignedTo && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <User2 className="w-3 h-3" />{order.assignedTo.name}
          </p>
        )}
      </td>

      {/* Garment */}
      <td className="px-3 py-3 hidden md:table-cell">
        <p className="text-sm">{order.garmentType}</p>
        {order.fabricName && <p className="text-xs text-muted-foreground">{order.fabricName}</p>}
        {order.designNotes && (
          <p className="text-[10px] text-[#D4AF37]/70 mt-0.5 truncate max-w-[180px]" title={order.designNotes}>
            ✦ {order.designNotes}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button disabled={statusUpdating === order.id} className="flex items-center gap-1 group/status">
              <OrderStatusBadge status={order.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover/status:opacity-100 transition-opacity" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change Status</div>
            <DropdownMenuSeparator />
            {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusUpdate(s)} className={cn("text-xs", statusConfig(s).color)}>
                {statusConfig(s).label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>

      {/* Delivery */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-400" : "text-muted-foreground")}>
          <Calendar className="w-3 h-3" />{formatDate(order.deliveryDate)}
        </span>
        {order.trialDate && (
          <span className="text-xs flex items-center gap-1 text-cyan-400/70 mt-0.5">
            <Calendar className="w-3 h-3" />Trial: {formatDate(order.trialDate)}
          </span>
        )}
      </td>

      {/* Amount */}
      <td className="px-3 py-3 text-right hidden lg:table-cell">
        <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
        <p className={cn("text-xs", balanceDue > 0 ? "text-yellow-400" : "text-green-400")}>
          {balanceDue > 0 ? `${formatCurrency(balanceDue)} due` : "Paid"}
        </p>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" onClick={onDesign} title="Bespoke Design" className="text-[#D4AF37] hover:text-[#D4AF37]">
            <Sparkles className="w-4 h-4" />
          </Button>
          {order.customer.phone && (
            <Button variant="ghost" size="icon-sm" className="text-green-400 hover:text-green-300"
              onClick={() => openWhatsApp(order.customer.phone, `Hello ${order.customer.name}, your order ${order.orderNumber} (${order.garmentType}) status: *${ORDER_STATUS_CONFIG[order.status]?.label}*. Delivery: ${formatDate(order.deliveryDate)}. — House of Tailors`)}>
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onQR} title="QR Code"><QrCode className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => printOrderSlip(order)}><Printer className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={onView}><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit}><Edit2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={deletingId === order.id} className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

/* ─────────────────────────────────────────────
   Compact Measurement Row (inside order detail)
───────────────────────────────────────────── */
function printMeasurement(measurement: Measurement, customerName: string) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  const u = measurement.unit === "cm" ? "cm" : "in";
  const sections = [
    { title: "Upper Body", items: [["Chest", measurement.chest], ["Waist", measurement.waist], ["Hip", measurement.hip], ["Shoulder", measurement.shoulder], ["Neck", measurement.neck], ["Sleeve", measurement.sleeve], ["Armhole", measurement.armhole]] },
    { title: "Lower Body", items: [["Inseam", measurement.inseam], ["Outseam", measurement.outseam], ["Rise", measurement.rise], ["Thigh", measurement.thigh], ["Ankle", measurement.ankle]] },
    { title: "Lengths", items: [["Back Length", measurement.backLength], ["Front Length", measurement.frontLength], ["Jacket Length", measurement.jacketLength], ["Shirt Length", measurement.shirtLength]] },
  ];
  const html = sections.map(({ title, items }) => {
    const filled = (items as [string, number | null][]).filter(([, v]) => v !== null);
    if (!filled.length) return "";
    return `<div class="section"><h3>${title}</h3><div class="grid">${filled.map(([l, v]) => `<div class="cell"><div class="cl">${l}</div><div class="cv">${v}${u}</div></div>`).join("")}</div></div>`;
  }).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Measurements — ${customerName}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}.hdr{text-align:center;border-bottom:2px solid #D4AF37;padding-bottom:16px;margin-bottom:20px}.hdr h1{margin:0;font-size:22px;color:#D4AF37;letter-spacing:2px}.hdr p{margin:4px 0 0;font-size:12px;color:#666}.meta{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:20px;padding:12px 16px;background:#f9f9f9;border-radius:8px;border:1px solid #eee}.mi .ml{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px}.mi .mv{font-size:13px;font-weight:600;margin-top:2px}.section{margin-bottom:18px}.section h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;margin:0 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cell{background:#f9f9f9;border:1px solid #eee;padding:8px;border-radius:6px;text-align:center}.cl{font-size:10px;color:#999;text-transform:uppercase}.cv{font-size:15px;font-weight:bold;margin-top:2px}.notes{background:#f9f9f9;border:1px solid #eee;padding:10px;border-radius:6px;font-size:12px}.sig{display:flex;justify-content:space-between;margin-top:48px}.sl{text-align:center;width:40%}.sl .line{border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#999}@media print{body{padding:10px}}</style></head><body>
    <div class="hdr"><h1>HOUSE OF TAILORS</h1><p>Measurement Record</p></div>
    <div class="meta"><div class="mi"><div class="ml">Client</div><div class="mv">${customerName}</div></div><div class="mi"><div class="ml">Label</div><div class="mv">${measurement.label}</div></div><div class="mi"><div class="ml">Unit</div><div class="mv">${measurement.unit}</div></div><div class="mi"><div class="ml">Date</div><div class="mv">${new Date(measurement.takenAt).toLocaleDateString("en-AE")}</div></div>${measurement.takenBy ? `<div class="mi"><div class="ml">By</div><div class="mv">${measurement.takenBy}</div></div>` : ""}</div>
    ${html}
    ${measurement.notes ? `<div class="section"><h3>Notes</h3><div class="notes">${measurement.notes}</div></div>` : ""}
    <div class="sig"><div class="sl"><div class="line">Client Signature</div></div><div class="sl"><div class="line">Tailor / Manager</div></div></div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function OrderMeasurementRow({
  measurement,
  customerName,
  isDeleting,
  onEdit,
  onDelete,
}: {
  measurement: Measurement;
  customerName: string;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const unit = measurement.unit === "cm" ? "cm" : "in";
  const keyFields = [
    { label: "Chest", value: measurement.chest },
    { label: "Waist", value: measurement.waist },
    { label: "Shoulder", value: measurement.shoulder },
    { label: "Sleeve", value: measurement.sleeve },
  ].filter((f) => f.value !== null);

  return (
    <div className="p-3 rounded-lg border border-border bg-secondary/20 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Ruler className="w-3.5 h-3.5 text-[#D4AF37]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{measurement.label}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D4AF37]/30 text-[#D4AF37]">
            {measurement.unit}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(measurement.takenAt), "dd MMM yyyy")}
          </span>
        </div>
        {keyFields.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {keyFields.map((f) => (
              <span key={f.label} className="text-xs">
                <span className="text-muted-foreground">{f.label}: </span>
                <span className="font-medium">{f.value}{unit}</span>
              </span>
            ))}
          </div>
        )}
        {measurement.takenBy && (
          <p className="text-[10px] text-muted-foreground mt-1">By: {measurement.takenBy}</p>
        )}
        {measurement.notes && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic truncate">{measurement.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => printMeasurement(measurement, customerName)} title="Print">
          <Printer className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} title="Edit">
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Order Detail View (inside Dialog)
───────────────────────────────────────────── */
function OrderDetailView({ order, onShowQR }: { order: OrderWithRelations; onShowQR: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "measurements">("details");
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const balanceDue = order.totalAmount - order.advanceAmount;

  const loadMeasurements = async () => {
    if (measurements !== null) return;
    setLoadingMeasurements(true);
    const data = await getMeasurements(order.customerId);
    setMeasurements(data);
    setLoadingMeasurements(false);
  };

  const handleTabChange = async (tab: "details" | "measurements") => {
    setActiveTab(tab);
    if (tab === "measurements") await loadMeasurements();
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm("Delete this measurement? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteMeasurement(id);
    if (result.success) {
      setMeasurements((prev) => prev?.filter((m) => m.id !== id) ?? null);
      toast.success("Measurement deleted");
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => handleTabChange("details")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "details"
              ? "border-[#D4AF37] text-[#D4AF37]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Details
        </button>
        <button
          onClick={() => handleTabChange("measurements")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "measurements"
              ? "border-[#D4AF37] text-[#D4AF37]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Ruler className="w-3.5 h-3.5" />
          Measurements
          {measurements !== null && measurements.length > 0 && (
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full leading-none">
              {measurements.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Details Tab ─────────────────────── */}
      {activeTab === "details" && (
        <div className="space-y-5">
          {/* Status & Priority + Actions */}
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <OrderStatusBadge status={order.status} size="lg" />
              <PriorityBadge priority={order.priority} />
              {order.invoice && (
                <Badge variant="info" className="text-xs">
                  Invoice #{order.invoice.invoiceNumber}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {order.customer.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                  onClick={() => openWhatsApp(
                    order.customer.phone,
                    `Hello ${order.customer.name}, your order ${order.orderNumber} (${order.garmentType}) status: *${ORDER_STATUS_CONFIG[order.status]?.label}*. Delivery: ${formatDate(order.deliveryDate)}. — House of Tailors`
                  )}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => printOrderSlip(order)}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Slip
              </Button>
              <Button variant="outline" size="sm" onClick={onShowQR}>
                <QrCode className="w-3.5 h-3.5 mr-1.5" />
                QR Code
              </Button>
            </div>
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
              <span className={cn("font-bold", balanceDue > 0 ? "text-yellow-400" : "text-green-400")}>
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
      )}

      {/* ── Measurements Tab ─────────────────── */}
      {activeTab === "measurements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{order.customer.name}</p>
              <p className="text-xs text-muted-foreground">
                {measurements?.length ?? 0} measurement record{measurements?.length !== 1 ? "s" : ""}
              </p>
            </div>
            {!showAddForm && !editMeasurement && (
              <Button variant="gold" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Measurement
              </Button>
            )}
          </div>

          {/* Add / Edit inline form */}
          {(showAddForm || editMeasurement) && (
            <div className="p-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-[#D4AF37]">
                  {editMeasurement ? "Edit Measurement" : "New Measurement"}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => { setShowAddForm(false); setEditMeasurement(null); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <MeasurementForm
                measurement={editMeasurement ?? undefined}
                defaultCustomerId={order.customerId}
                onSuccess={(m) => {
                  if (editMeasurement) {
                    setMeasurements((prev) => prev?.map((x) => x.id === m.id ? m : x) ?? null);
                  } else {
                    setMeasurements((prev) => prev ? [m, ...prev] : [m]);
                  }
                  setShowAddForm(false);
                  setEditMeasurement(null);
                }}
                onCancel={() => { setShowAddForm(false); setEditMeasurement(null); }}
              />
            </div>
          )}

          {/* Loading spinner */}
          {loadingMeasurements && (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading measurements...
            </div>
          )}

          {/* Empty state */}
          {!loadingMeasurements && measurements !== null && measurements.length === 0 && !showAddForm && (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Ruler className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No measurements recorded yet</p>
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add first measurement
              </Button>
            </div>
          )}

          {/* Measurements list */}
          {!loadingMeasurements && measurements !== null && measurements.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {measurements.map((m) => (
                <OrderMeasurementRow
                  key={m.id}
                  measurement={m}
                  customerName={order.customer.name}
                  isDeleting={deletingId === m.id}
                  onEdit={() => { setEditMeasurement(m); setShowAddForm(false); }}
                  onDelete={() => handleDeleteMeasurement(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
