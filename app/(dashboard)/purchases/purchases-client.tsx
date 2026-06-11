"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, Package, DollarSign, TrendingDown, AlertTriangle,
  ChevronDown, Link2, Trash2, Eye, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createPurchase, updatePurchaseStatus, deletePurchase } from "@/actions/purchases";
import { displayOrderNumber } from "@/lib/utils";
import type { PurchaseWithRelations, PaginatedResult, Supplier } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const purchaseFormSchema = z.object({
  supplierId: z.string().optional(),
  itemName: z.string().min(1, "Item name required"),
  category: z.string().default("FABRIC"),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("meters"),
  unitPrice: z.coerce.number().nonnegative(),
  totalAmount: z.coerce.number().nonnegative(),
  paidAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
  purchaseDate: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

const CATEGORIES = ["FABRIC", "THREAD", "BUTTONS", "LINING", "ACCESSORIES", "EQUIPMENT", "OTHER"];

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING_PURCHASE", label: "Pending Purchase" },
  { value: "FABRIC_ORDERED", label: "Fabric Ordered" },
  { value: "FABRIC_COLLECTED", label: "Fabric Collected" },
] as const;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING_PURCHASE: { label: "Pending Purchase", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  FABRIC_ORDERED:   { label: "Fabric Ordered",   className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  FABRIC_COLLECTED: { label: "Fabric Collected", className: "bg-green-500/15 text-green-400 border-green-500/30" },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  MEASUREMENT: "Measurement", FABRIC_ORDERING: "Fabric Ordering",
  FABRIC_COLLECTED: "Fabric Collected", CUTTING: "Cutting",
  SEMI_STITCH: "Semi Stitch", TRIAL: "Trial",
  FINAL_STITCH: "Final Stitch", READY_FOR_DELIVERY: "Ready for Delivery",
  DELIVERED: "Delivered", ORDER_CLOSED: "Closed",
};

interface PurchasesClientProps {
  initialData: PaginatedResult<PurchaseWithRelations>;
  stats: { totalSpend: number; paidAmount: number; dueAmount: number; categoryBreakdown: Array<{ category: string; _sum: { totalAmount: number | null }; _count: number }> };
  suppliers: Supplier[];
}

export function PurchasesClient({ initialData, stats, suppliers }: PurchasesClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<"ALL" | "PENDING_PURCHASE" | "FABRIC_ORDERED" | "FABRIC_COLLECTED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [detailPurchase, setDetailPurchase] = useState<PurchaseWithRelations | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema) as any, // eslint-disable-line
    defaultValues: { category: "FABRIC", unit: "meters", paidAmount: 0 },
  });

  const quantity = watch("quantity");
  const unitPrice = watch("unitPrice");

  React.useEffect(() => {
    if (quantity && unitPrice) {
      setValue("totalAmount", parseFloat((quantity * unitPrice).toFixed(2)));
    }
  }, [quantity, unitPrice, setValue]);

  const onSubmit = async (formData: PurchaseFormData) => {
    const result = await createPurchase(formData);
    if (result.success) {
      toast.success("Purchase recorded");
      setCreateOpen(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusChange = async (
    purchaseId: string,
    newStatus: "PENDING_PURCHASE" | "FABRIC_ORDERED" | "FABRIC_COLLECTED"
  ) => {
    setUpdatingId(purchaseId);
    const result = await updatePurchaseStatus(purchaseId, newStatus);
    setUpdatingId(null);
    if (result.success) {
      toast.success(`${STATUS_CONFIG[newStatus].label} — order kanban updated`);
      setData((prev) => ({
        ...prev,
        data: prev.data.map((p) => p.id === purchaseId ? { ...p, status: newStatus } : p),
      }));
      // Update detail dialog if it's open for this purchase
      setDetailPurchase((prev) => prev?.id === purchaseId ? { ...prev, status: newStatus } : prev);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (purchaseId: string) => {
    if (confirmDeleteId !== purchaseId) {
      setConfirmDeleteId(purchaseId);
      return;
    }
    setDeletingId(purchaseId);
    setConfirmDeleteId(null);
    const result = await deletePurchase(purchaseId);
    setDeletingId(null);
    if (result.success) {
      toast.success("Purchase deleted");
      setData((prev) => ({ ...prev, data: prev.data.filter((p) => p.id !== purchaseId) }));
      if (detailPurchase?.id === purchaseId) setDetailPurchase(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const filtered = activeStatus === "ALL"
    ? data.data
    : data.data.filter((p) => p.status === activeStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchases & Inventory</h1>
          <p className="text-sm text-muted-foreground">Track fabric and material purchases</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Record Purchase
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-gold">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-xl font-bold text-[#D4AF37]">{formatCurrency(stats.totalSpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-xl font-bold text-green-400">{formatCurrency(stats.paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.dueAmount > 0 ? "border-red-500/20 bg-red-500/5" : ""}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount Due</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(stats.dueAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/40 w-fit">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "ALL"
            ? data.data.length
            : data.data.filter((p) => p.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeStatus === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${
                activeStatus === tab.value ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-secondary text-muted-foreground"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Purchase list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {activeStatus === "ALL" ? "No purchases recorded" : `No purchases with status: ${STATUS_CONFIG[activeStatus]?.label}`}
          </p>
          {activeStatus === "ALL" && (
            <Button variant="gold" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Record Purchase
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((purchase, i) => {
            const statusCfg = STATUS_CONFIG[purchase.status ?? "PENDING_PURCHASE"];
            const isConfirmingDelete = confirmDeleteId === purchase.id;
            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card"
              >
                {/* Click icon to open detail */}
                <button
                  type="button"
                  onClick={() => setDetailPurchase(purchase)}
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-secondary/80 transition-colors"
                  title="View details"
                >
                  <Package className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDetailPurchase(purchase)}
                      className="text-sm font-medium hover:text-[#D4AF37] transition-colors text-left"
                    >
                      {purchase.itemName}
                    </button>
                    <Badge variant="outline" className="text-[10px]">{purchase.category}</Badge>
                    {statusCfg && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {purchase.quantity} {purchase.unit}
                    {purchase.supplier && ` · ${purchase.supplier.name}`}
                    {` · ${formatDate(purchase.purchaseDate)}`}
                  </p>
                  {purchase.order && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Order <span className="text-foreground font-medium">{displayOrderNumber(purchase.order)}</span>
                        {purchase.order.customer && ` · ${purchase.order.customer.name}`}
                      </span>
                    </div>
                  )}
                  {(purchase.fabricCode || purchase.fabricColor) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[purchase.fabricCode && `Code: ${purchase.fabricCode}`, purchase.fabricColor && `Color: ${purchase.fabricColor}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {(purchase.purchaseNotes || purchase.notes) && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{purchase.purchaseNotes || purchase.notes}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
                    {purchase.paidAmount < purchase.totalAmount && (
                      <p className="text-xs text-red-400">Due: {formatCurrency(purchase.totalAmount - purchase.paidAmount)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View detail */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => setDetailPurchase(purchase)}
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>

                    {/* Delete with inline confirm */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-destructive">Delete?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                          disabled={deletingId === purchase.id}
                          onClick={() => handleDelete(purchase.id)}
                        >
                          Yes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === purchase.id}
                        onClick={() => handleDelete(purchase.id)}
                        title="Delete purchase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Status update */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={updatingId === purchase.id}
                        >
                          {updatingId === purchase.id ? "Updating..." : "Status"}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(purchase.id, "PENDING_PURCHASE")}
                          disabled={purchase.status === "PENDING_PURCHASE"}
                          className="text-xs"
                        >
                          Pending Purchase
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(purchase.id, "FABRIC_ORDERED")}
                          disabled={purchase.status === "FABRIC_ORDERED"}
                          className="text-xs"
                        >
                          Mark as Ordered
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(purchase.id, "FABRIC_COLLECTED")}
                          disabled={purchase.status === "FABRIC_COLLECTED"}
                          className="text-xs"
                        >
                          Mark as Collected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Detail Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!detailPurchase} onOpenChange={(o) => { if (!o) setDetailPurchase(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailPurchase && (() => {
            const p = detailPurchase;
            const statusCfg = STATUS_CONFIG[p.status ?? "PENDING_PURCHASE"];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {p.itemName}
                    {statusCfg && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                  {/* Purchase details */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <DetailRow label="Category" value={p.category} />
                    <DetailRow label="Quantity" value={`${p.quantity} ${p.unit}`} />
                    <DetailRow label="Unit Price" value={formatCurrency(p.unitPrice)} />
                    <DetailRow label="Total" value={formatCurrency(p.totalAmount)} highlight />
                    <DetailRow label="Paid" value={formatCurrency(p.paidAmount)} />
                    <DetailRow
                      label="Due"
                      value={formatCurrency(p.totalAmount - p.paidAmount)}
                      className={p.totalAmount - p.paidAmount > 0 ? "text-red-400" : "text-green-400"}
                    />
                    {p.supplier && <DetailRow label="Supplier" value={p.supplier.name} />}
                    <DetailRow label="Date" value={formatDate(p.purchaseDate)} />
                    {p.fabricCode && <DetailRow label="Fabric Code" value={p.fabricCode} />}
                    {p.fabricColor && <DetailRow label="Fabric Color" value={p.fabricColor} />}
                  </div>

                  {(p.notes || p.purchaseNotes) && (
                    <div className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{p.purchaseNotes || p.notes}</p>
                    </div>
                  )}

                  {/* Linked order */}
                  {p.order && (
                    <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide">Linked Order</p>
                        <a
                          href={`/orders?search=${encodeURIComponent(displayOrderNumber(p.order))}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3 h-3" />View Order
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <DetailRow label="Order No." value={displayOrderNumber(p.order)} />
                        <DetailRow label="Customer" value={p.order.customer?.name ?? "—"} />
                        {p.order.status && (
                          <DetailRow label="Order Status" value={ORDER_STATUS_LABEL[p.order.status] ?? p.order.status} />
                        )}
                      </div>

                      {/* Order garment items with fabric details */}
                      {p.order.items && p.order.items.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-[#D4AF37]/10">
                          <p className="text-xs font-medium text-muted-foreground">Garment Items</p>
                          {p.order.items.map((item, idx) => (
                            <div key={item.id ?? idx} className="rounded-md border border-border/40 bg-background/50 p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{item.garmentType}</span>
                                <span className="text-xs text-muted-foreground">Qty {item.quantity}</span>
                              </div>
                              {(item.fabricCode || item.fabricColor || item.fabricComposition) && (
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                  {item.fabricCode && <span className="text-[11px] text-muted-foreground">Code: <span className="text-foreground">{item.fabricCode}</span></span>}
                                  {item.fabricColor && <span className="text-[11px] text-muted-foreground">Color: <span className="text-foreground">{item.fabricColor}</span></span>}
                                  {item.fabricComposition && <span className="text-[11px] text-muted-foreground">Composition: <span className="text-foreground">{item.fabricComposition}</span></span>}
                                </div>
                              )}
                              {item.fabricImageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(item.fabricImageUrl!)}
                                  className="mt-1 rounded overflow-hidden border border-border hover:border-[#D4AF37]/60 transition-colors focus:outline-none"
                                  title="View full image"
                                >
                                  <img src={item.fabricImageUrl} alt="Fabric" className="h-12 w-12 object-cover" />
                                </button>
                              )}
                              {item.notes && <p className="text-[11px] text-muted-foreground italic">{item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions inside dialog */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1" disabled={updatingId === p.id}>
                          {updatingId === p.id ? "Updating..." : "Update Status"}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleStatusChange(p.id, "PENDING_PURCHASE")} disabled={p.status === "PENDING_PURCHASE"} className="text-xs">
                          Pending Purchase
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(p.id, "FABRIC_ORDERED")} disabled={p.status === "FABRIC_ORDERED"} className="text-xs">
                          Mark as Ordered
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(p.id, "FABRIC_COLLECTED")} disabled={p.status === "FABRIC_COLLECTED"} className="text-xs">
                          Mark as Collected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive gap-1.5"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === p.id ? "Confirm Delete" : "Delete"}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => { if (!o) setLightboxUrl(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-border/40">
          <DialogHeader className="sr-only">
            <DialogTitle>Fabric Image</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Fabric full view"
              className="w-full max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Purchase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input placeholder="e.g. Cotton fabric, Silk lining..." {...register("itemName")} />
              {errors.itemName && <p className="text-xs text-destructive">{errors.itemName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select defaultValue="FABRIC" onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select onValueChange={(v) => setValue("supplierId", v === "none" ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="text" inputMode="decimal" {...register("quantity")} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder="meters" {...register("unit")} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (AED) *</Label>
                <Input type="text" inputMode="decimal" {...register("unitPrice")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Amount (AED)</Label>
                <Input type="text" inputMode="decimal" {...register("totalAmount")} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Paid (AED)</Label>
                <Input type="text" inputMode="decimal" {...register("paidAmount")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" {...register("purchaseDate")} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." rows={2} {...register("notes")} />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">Record Purchase</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
  className?: string;
}) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-[#D4AF37]" : ""} ${className ?? ""}`}>{value}</p>
    </div>
  );
}
