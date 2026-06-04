"use client";

import React, { useCallback, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { invoiceSchema, type InvoiceFormData } from "@/validators/invoice";
import { createInvoice, updateInvoice } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { InvoiceWithRelations, Customer, Order } from "@/types";

interface InvoiceFormProps {
  invoice?: InvoiceWithRelations;
  customers?: Customer[];
  orders?: Order[];
  defaultCustomerId?: string;
  onSuccess?: (invoice: InvoiceWithRelations) => void;
  onCancel?: () => void;
}

const ITEM_DESCRIPTIONS = [
  "Custom 2 piece suit",
  "Custom 3 piece suit",
  "Custom shirt",
  "Custom vest coat",
  "Custom Trouser",
  "Custom pocket square",
  "Custom Tie",
  "Ready made pocket square",
  "Ready made Tie",
  "Stud button set",
  "Cufflink",
  "Shirt Alteration",
  "Trouser Alteration",
  "T shirt Alteration",
  "Skirt Alteration",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED", label: "Fixed Amount (AED)" },
] as const;

export function InvoiceForm({
  invoice,
  customers,
  orders,
  defaultCustomerId,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const isEditing = !!invoice;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: invoice?.customerId ?? defaultCustomerId ?? "",
      orderId: invoice?.orderId ?? "",
      status: invoice?.status ?? "DRAFT",
      items: invoice?.items?.length
        ? invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          }))
        : [{ description: "", quantity: "", unitPrice: "", amount: 0 }],
      subtotal: invoice?.subtotal ?? 0,
      discountType: (invoice?.discountType as "PERCENTAGE" | "FIXED") ?? undefined,
      discountValue: invoice?.discountValue ?? 0,
      taxRate: 5,
      taxAmount: invoice?.taxAmount ?? 0,
      totalAmount: invoice?.totalAmount ?? 0,
      paidAmount: invoice?.paidAmount ?? 0,
      dueAmount: invoice?.dueAmount ?? 0,
      dueDate: invoice?.dueDate
        ? new Date(invoice.dueDate).toISOString().split("T")[0]
        : "",
      notes: invoice?.notes ?? "",
      terms: invoice?.terms ?? "Payment due within 30 days of invoice date.",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [customItems, setCustomItems] = useState<Record<string, boolean>>({});

  // Auto-calculate item amounts and totals
  const recalculate = useCallback(() => {
    const currentItems = getValues("items");
    let subtotal = 0;

    currentItems.forEach((item, i) => {
      const amount = (item.quantity ?? 0) * (item.unitPrice ?? 0);
      setValue(`items.${i}.amount`, amount);
      subtotal += amount;
    });

    setValue("subtotal", subtotal);

    const dv = getValues("discountValue") ?? 0;
    const dt = getValues("discountType");
    const discountAmt =
      dt === "PERCENTAGE" ? (subtotal * dv) / 100 : dv;

    const taxableAmount = Math.max(0, subtotal - discountAmt);
    const tr = getValues("taxRate") ?? 5;
    const taxAmt = (taxableAmount * tr) / 100;
    const total = taxableAmount + taxAmt;
    const paid = getValues("paidAmount") ?? 0;

    setValue("taxAmount", Math.round(taxAmt * 100) / 100);
    setValue("totalAmount", Math.round(total * 100) / 100);
    setValue("dueAmount", Math.max(0, Math.round((total - paid) * 100) / 100));
  }, [getValues, setValue]);


  const onSubmit = async (data: InvoiceFormData) => {
    const result = isEditing
      ? await updateInvoice(invoice.id, data)
      : await createInvoice(data);

    if (result.success) {
      toast.success(result.message ?? "Invoice saved");
      onSuccess?.(result.data as InvoiceWithRelations);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer & Order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {customers && customers.length > 0 && (
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.customerId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>

        {orders && orders.length > 0 && (
          <div className="space-y-1.5">
            <Label>Linked Order</Label>
            <Controller
              name="orderId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to order (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked order</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {(o as Order & { orderNumber: string }).orderNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#D4AF37]">Line Items *</h3>
          <Button
            type="button"
            variant="gold-outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Item
          </Button>
        </div>

        {errors.items && typeof errors.items === "object" && "message" in errors.items && (
          <p className="text-xs text-destructive">{(errors.items as { message?: string }).message}</p>
        )}

        <div className="rounded-lg border border-border/60 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          {/* Items */}
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-border/30 items-center"
            >
              <div className="col-span-5">
                {customItems[field.id] ? (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Type description..."
                      {...register(`items.${i}.description`)}
                      className={cn("text-sm h-8 flex-1", errors.items?.[i]?.description ? "border-destructive" : "")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground"
                      onClick={() => {
                        setValue(`items.${i}.description`, "");
                        setCustomItems((prev) => { const next = { ...prev }; delete next[field.id]; return next; });
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Controller
                    name={`items.${i}.description`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        value={f.value || ""}
                        onValueChange={(v) => {
                          if (v === "__other__") {
                            f.onChange("");
                            setCustomItems((prev) => ({ ...prev, [field.id]: true }));
                          } else {
                            f.onChange(v);
                          }
                        }}
                      >
                        <SelectTrigger className={cn("h-8 text-sm", errors.items?.[i]?.description ? "border-destructive" : "")}>
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_DESCRIPTIONS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                          <SelectItem value="__other__">Other (type manually)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>
              <div className="col-span-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  {...register(`items.${i}.quantity`)}
                  onBlur={recalculate}
                  className="text-sm h-8 text-right"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  {...register(`items.${i}.unitPrice`)}
                  onBlur={recalculate}
                  className="text-sm h-8 text-right"
                />
              </div>
              <div className="col-span-2 text-right text-sm font-medium text-[#D4AF37]">
                {formatCurrency(watchedValues.items?.[i]?.amount ?? 0)}
              </div>
              <div className="col-span-1 flex justify-center">
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => { remove(i); recalculate(); }}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discount & Tax */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border border-border/40 bg-secondary/20">
        <div className="space-y-1.5">
          <Label>Discount Type</Label>
          <Controller
            name="discountType"
            control={control}
            render={({ field }) => (
              <Select value={field.value || "none"} onValueChange={(v) => { field.onChange(v === "none" ? "" : v); recalculate(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="No discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No discount</SelectItem>
                  {DISCOUNT_TYPE_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="discountValue">Discount Value</Label>
          <Input
            id="discountValue"
            type="text"
            inputMode="decimal"
            {...register("discountValue")}
            onBlur={recalculate}
            disabled={!watchedValues.discountType}
          />
        </div>

        <div className="space-y-1.5">
          <Label>VAT</Label>
          <Input value="5% (Fixed)" readOnly className="bg-secondary/40 text-muted-foreground cursor-default" />
          <input type="hidden" {...register("taxRate")} value={5} />
        </div>
      </div>

      {/* Totals Summary */}
      <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(watchedValues.subtotal ?? 0)}</span>
        </div>
        {(watchedValues.discountValue ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Discount
              {watchedValues.discountType === "PERCENTAGE"
                ? ` (${watchedValues.discountValue}%)`
                : ""}
            </span>
            <span className="text-red-400">
              -{" "}
              {watchedValues.discountType === "PERCENTAGE"
                ? formatCurrency(
                    ((watchedValues.subtotal ?? 0) * (watchedValues.discountValue ?? 0)) / 100
                  )
                : formatCurrency(watchedValues.discountValue ?? 0)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT (5%)</span>
          <span>{formatCurrency(watchedValues.taxAmount ?? 0)}</span>
        </div>
        <div className="h-px bg-border/50 my-1" />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="text-[#D4AF37]">{formatCurrency(watchedValues.totalAmount ?? 0)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="paidAmount">Amount Paid (AED)</Label>
            <Input
              id="paidAmount"
              type="text"
              inputMode="decimal"
              {...register("paidAmount")}
              onBlur={recalculate}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount Due</Label>
            <div className="h-10 flex items-center px-3 rounded-md border border-border/40 bg-background/50">
              <span
                className={cn(
                  "text-sm font-semibold",
                  (watchedValues.dueAmount ?? 0) > 0 ? "text-red-400" : "text-green-400"
                )}
              >
                {formatCurrency(watchedValues.dueAmount ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Thank you for your business..."
            rows={3}
            {...register("notes")}
            className="resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            rows={3}
            {...register("terms")}
            className="resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
