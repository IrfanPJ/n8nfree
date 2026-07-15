"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductionOrder, updateProductionOrder } from "@/actions/production-orders";
import { toIsoDateLocal } from "@/lib/production-calc";
import { productionOrderSchema, type ProductionOrderFormData } from "@/validators/production";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES } from "@/types/production";
import type { ProductionOrderWithRelations, ProductionTailor, ProductionPriceListItem } from "@/types/production";

export function ProductionOrderDialog({
  open,
  onOpenChange,
  order,
  tailors,
  priceListItems,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ProductionOrderWithRelations | null;
  tailors: ProductionTailor[];
  priceListItems: ProductionPriceListItem[];
  onSaved?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors },
  } = useForm<ProductionOrderFormData>({
    resolver: zodResolver(productionOrderSchema) as any, // eslint-disable-line
  });

  useEffect(() => {
    if (!open) return;
    reset(
      order
        ? {
            receivedDate: order.receivedDate,
            store: order.store,
            invoiceNo: order.invoiceNo,
            notes: order.notes ?? "",
            itemRaw: order.itemRaw,
            priceListItemId: order.priceListItemId ?? undefined,
            qty: order.qty,
            tailorId: order.tailorId ?? undefined,
            deliveryDate: order.deliveryDate ?? "",
            dispatchTime: order.dispatchTime ?? "",
            scheduledDispatchDate: order.scheduledDispatchDate ?? "",
            possibleTime: order.possibleTime ?? "",
            status: order.status,
            remarks: order.remarks ?? "",
          }
        : {
            receivedDate: toIsoDateLocal(new Date()),
            store: "SHJ",
            invoiceNo: "",
            itemRaw: "",
            qty: 1,
            status: "PENDING",
          }
    );
  }, [open, order, reset]);

  const priceListItemId = watch("priceListItemId");

  async function onSubmit(data: ProductionOrderFormData) {
    setSubmitting(true);
    const result = order
      ? await updateProductionOrder(order.id, data)
      : await createProductionOrder(data);
    setSubmitting(false);
    if (result.success) {
      toast.success(result.message ?? "Saved");
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(result.error ?? "Failed to save order");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? `Edit Order ${order.invoiceNo}` : "New Production Order"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Received Date</Label>
              <Input type="date" {...register("receivedDate")} />
              {errors.receivedDate && <p className="text-xs text-destructive mt-1">{errors.receivedDate.message}</p>}
            </div>
            <div>
              <Label>Store</Label>
              <Controller
                control={control}
                name="store"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_STORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invoice No.</Label>
              <Input {...register("invoiceNo")} placeholder="e.g. 16313" />
              {errors.invoiceNo && <p className="text-xs text-destructive mt-1">{errors.invoiceNo.message}</p>}
            </div>
            <div>
              <Label>Qty</Label>
              <Input type="number" min={1} {...register("qty")} />
            </div>
          </div>

          <div>
            <Label>Item</Label>
            <Controller
              control={control}
              name="priceListItemId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={(v) => {
                    field.onChange(v === "__none" ? undefined : v);
                    const picked = priceListItems.find((p) => p.id === v);
                    if (picked) setValue("itemRaw", picked.item);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select from price list (optional)" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none">— Not in price list —</SelectItem>
                    {priceListItems.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.item} (AED {p.unitPrice})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input className="mt-2" {...register("itemRaw")} placeholder="Item text (auto-filled from selection above, or type freely)" />
            {errors.itemRaw && <p className="text-xs text-destructive mt-1">{errors.itemRaw.message}</p>}
            {!priceListItemId && <p className="text-xs text-muted-foreground mt-1">No price list match — piece pay for this order will be AED 0 until mapped.</p>}
          </div>

          <div>
            <Label>Assigned Tailor</Label>
            <Controller
              control={control}
              name="tailorId"
              render={({ field }) => (
                <Select value={field.value ?? "__none"} onValueChange={(v) => field.onChange(v === "__none" ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {tailors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivery Date</Label>
              <Input type="date" {...register("deliveryDate")} />
            </div>
            <div>
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {PRODUCTION_ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Scheduled Dispatch Date</Label>
              <Input type="date" {...register("scheduledDispatchDate")} />
            </div>
            <div>
              <Label>Dispatch Time</Label>
              <Input type="time" {...register("dispatchTime")} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input {...register("notes")} placeholder="e.g. ALTERATION, TRIAL ON 22.6.26" />
          </div>

          <div>
            <Label>Remarks</Label>
            <Textarea rows={2} {...register("remarks")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
