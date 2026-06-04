"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Package, DollarSign, TrendingDown, AlertTriangle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { createPurchase } from "@/actions/purchases";
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

interface PurchasesClientProps {
  initialData: PaginatedResult<PurchaseWithRelations>;
  stats: { totalSpend: number; paidAmount: number; dueAmount: number; categoryBreakdown: Array<{ category: string; _sum: { totalAmount: number | null }; _count: number }> };
  suppliers: Supplier[];
}

export function PurchasesClient({ initialData, stats, suppliers }: PurchasesClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [createOpen, setCreateOpen] = useState(false);

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

  const onSubmit = async (data: PurchaseFormData) => {
    const result = await createPurchase(data);
    if (result.success) {
      toast.success("Purchase recorded");
      setCreateOpen(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

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

      {/* Purchase list */}
      {data.data.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No purchases recorded</p>
          <Button variant="gold" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Record Purchase
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((purchase, i) => (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{purchase.itemName}</p>
                  <Badge variant="outline" className="text-[10px]">{purchase.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {purchase.quantity} {purchase.unit}
                  {purchase.supplier && ` · ${purchase.supplier.name}`}
                  {` · ${formatDate(purchase.purchaseDate)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(purchase.totalAmount)}</p>
                {purchase.paidAmount < purchase.totalAmount && (
                  <p className="text-xs text-red-400">
                    Due: {formatCurrency(purchase.totalAmount - purchase.paidAmount)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
