"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Package,
  ChevronDown, ChevronUp, Minus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createFabric, updateFabric, adjustStock, deleteFabric } from "@/actions/fabrics";
import { fabricSchema, type FabricFormData, FABRIC_TYPES } from "@/validators/fabric";
import type { Fabric } from "@/types";
import { cn } from "@/lib/utils";

interface FabricsClientProps {
  initialFabrics: Fabric[];
}

function FabricForm({
  fabric,
  onSuccess,
  onCancel,
}: {
  fabric?: Fabric;
  onSuccess: (f: Fabric) => void;
  onCancel: () => void;
}) {
  const isEditing = !!fabric;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FabricFormData>({
    resolver: zodResolver(fabricSchema) as any,
    defaultValues: {
      name: fabric?.name ?? "",
      type: fabric?.type ?? "",
      color: fabric?.color ?? "",
      stockQty: fabric?.stockQty ?? 0,
      reorderLevel: fabric?.reorderLevel ?? 5,
      supplier: fabric?.supplier ?? "",
      pricePerUnit: fabric?.pricePerUnit ?? 0,
      unit: fabric?.unit ?? "m",
      notes: fabric?.notes ?? "",
    },
  });

  const onSubmit = async (data: FabricFormData) => {
    const result = isEditing
      ? await updateFabric(fabric.id, data)
      : await createFabric(data);
    if (result.success && result.data) {
      toast.success(result.message ?? "Saved");
      onSuccess(result.data);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Fabric Name *</Label>
          <Input placeholder="e.g. Italian Wool Charcoal" {...register("name")} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Controller name="type" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={errors.type ? "border-destructive" : ""}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FABRIC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label>Colour</Label>
          <Input placeholder="e.g. Navy Blue" {...register("color")} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock Quantity *</Label>
          <div className="flex gap-2">
            <Input type="text" inputMode="decimal"{...register("stockQty")} />
            <Controller name="unit" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="yd">yd</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Reorder Level</Label>
          <Input type="text" inputMode="decimal"{...register("reorderLevel")} />
        </div>
        <div className="space-y-1.5">
          <Label>Price per Unit (AED)</Label>
          <Input type="text" inputMode="decimal"{...register("pricePerUnit")} />
        </div>
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <Input placeholder="Supplier name" {...register("supplier")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} {...register("notes")} className="resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update" : "Add Fabric"}
        </Button>
      </div>
    </form>
  );
}

function StockAdjustModal({
  fabric,
  onSuccess,
  onClose,
}: {
  fabric: Fabric;
  onSuccess: (f: Fabric) => void;
  onClose: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleAdjust = async () => {
    if (delta === 0) return;
    setLoading(true);
    const result = await adjustStock(fabric.id, delta);
    setLoading(false);
    if (result.success && result.data) {
      toast.success(result.message ?? "Stock updated");
      onSuccess(result.data);
    } else {
      toast.error(result.error ?? "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-secondary/50 space-y-1">
        <p className="text-sm font-medium">{fabric.name}</p>
        <p className="text-2xl font-bold">{fabric.stockQty} {fabric.unit}</p>
        <p className="text-xs text-muted-foreground">Reorder at: {fabric.reorderLevel} {fabric.unit}</p>
      </div>
      <div className="space-y-2">
        <Label>Adjust quantity</Label>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" onClick={() => setDelta((d) => d - 1)}>
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <span className={cn("text-xl font-bold", delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "")}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              → New total: {Math.max(0, fabric.stockQty + delta)} {fabric.unit}
            </p>
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => setDelta((d) => d + 1)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="gold" loading={loading} disabled={delta === 0} onClick={handleAdjust} className="flex-1">
          Update Stock
        </Button>
      </div>
    </div>
  );
}

export function FabricsClient({ initialFabrics }: FabricsClientProps) {
  const [fabrics, setFabrics] = useState<Fabric[]>(initialFabrics);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFabric, setEditFabric] = useState<Fabric | null>(null);
  const [stockFabric, setStockFabric] = useState<Fabric | null>(null);

  const filtered = useMemo(() => {
    let list = fabrics;
    if (search) list = list.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.type.toLowerCase().includes(search.toLowerCase()));
    if (showLowStock) list = list.filter((f) => f.stockQty <= f.reorderLevel);
    return list;
  }, [fabrics, search, showLowStock]);

  const lowStockCount = useMemo(() => fabrics.filter((f) => f.stockQty <= f.reorderLevel).length, [fabrics]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this fabric?")) return;
    setFabrics((prev) => prev.filter((f) => f.id !== id));
    const result = await deleteFabric(id);
    if (!result.success) toast.error("Failed to delete");
  };

  const handleFormSuccess = (fabric: Fabric) => {
    if (editFabric) {
      setFabrics((prev) => prev.map((f) => (f.id === fabric.id ? fabric : f)));
    } else {
      setFabrics((prev) => [fabric, ...prev]);
    }
    setModalOpen(false);
    setEditFabric(null);
  };

  const handleStockSuccess = (fabric: Fabric) => {
    setFabrics((prev) => prev.map((f) => (f.id === fabric.id ? fabric : f)));
    setStockFabric(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fabric Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fabrics.length} fabrics
            {lowStockCount > 0 && <span className="text-red-400 ml-2">· {lowStockCount} low stock</span>}
          </p>
        </div>
        <Button variant="gold" onClick={() => { setEditFabric(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Fabric
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
          onClick={() => setShowLowStock((v) => !v)}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400 flex-1">
            <span className="font-semibold">{lowStockCount} fabric{lowStockCount !== 1 ? "s" : ""}</span> at or below reorder level.
          </p>
          <span className="text-xs text-amber-400">{showLowStock ? "Show all" : "Show low stock only"}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search fabrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colour</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reorder</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price/Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <AnimatePresence>
                {filtered.map((fabric) => {
                  const isLow = fabric.stockQty <= fabric.reorderLevel;
                  return (
                    <motion.tr
                      key={fabric.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("hover:bg-secondary/20 transition-colors", isLow && "bg-red-500/5")}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                          <span className="font-medium">{fabric.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fabric.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fabric.color ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-semibold", isLow ? "text-red-400" : "text-green-400")}>
                          {fabric.stockQty} {fabric.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fabric.reorderLevel} {fabric.unit}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fabric.supplier ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {fabric.pricePerUnit > 0 ? `AED ${fabric.pricePerUnit}/${fabric.unit}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setStockFabric(fabric)}
                          >
                            Adjust Stock
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => { setEditFabric(fabric); setModalOpen(true); }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(fabric.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No fabrics found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditFabric(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4AF37]" />
              {editFabric ? "Edit Fabric" : "Add Fabric"}
            </DialogTitle>
          </DialogHeader>
          <FabricForm
            fabric={editFabric ?? undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => { setModalOpen(false); setEditFabric(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Dialog */}
      <Dialog open={!!stockFabric} onOpenChange={(o) => { if (!o) setStockFabric(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {stockFabric && (
            <StockAdjustModal
              fabric={stockFabric}
              onSuccess={handleStockSuccess}
              onClose={() => setStockFabric(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
