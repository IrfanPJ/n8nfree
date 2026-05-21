"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { orderSchema, type OrderFormData } from "@/validators/order";
import { createOrder, updateOrder } from "@/actions/orders";
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
import { getCustomers } from "@/actions/customers";
import type { OrderWithRelations, Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface OrderFormProps {
  order?: OrderWithRelations;
  defaultCustomerId?: string;
  onSuccess?: (order: OrderWithRelations) => void;
  onCancel?: () => void;
}

const GARMENT_TYPES = [
  "Suit",
  "Sherwani",
  "Kurta",
  "Shirt",
  "Trousers",
  "Blazer",
  "Waistcoat",
  "Lehenga",
  "Saree Blouse",
  "Salwar Kameez",
  "Gown",
  "Other",
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function OrderForm({
  order,
  defaultCustomerId,
  onSuccess,
  onCancel,
}: OrderFormProps) {
  const isEditing = !!order;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [balanceDue, setBalanceDue] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: order?.customerId ?? defaultCustomerId ?? "",
      garmentType: order?.garmentType ?? "",
      fabricName: order?.fabricName ?? "",
      fabricColor: order?.fabricColor ?? "",
      fabricQuantity:
        order?.fabricQuantity !== null && order?.fabricQuantity !== undefined
          ? order.fabricQuantity
          : undefined,
      deliveryDate: order?.deliveryDate
        ? new Date(order.deliveryDate).toISOString().split("T")[0]
        : "",
      trialDate: order?.trialDate
        ? new Date(order.trialDate).toISOString().split("T")[0]
        : "",
      totalAmount: order?.totalAmount ?? 0,
      advanceAmount: order?.advanceAmount ?? 0,
      priority: order?.priority ?? "NORMAL",
      designNotes: order?.designNotes ?? "",
      notes: order?.notes ?? "",
      assignedToId: order?.assignedToId ?? "",
    },
  });

  const totalAmount = watch("totalAmount");
  const advanceAmount = watch("advanceAmount");

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const advance = Number(advanceAmount) || 0;
    setBalanceDue(Math.max(0, total - advance));
  }, [totalAmount, advanceAmount]);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const result = await getCustomers({ pageSize: 200 });
        setCustomers(result.data);
      } catch {
        toast.error("Failed to load customers");
      } finally {
        setLoadingCustomers(false);
      }
    }
    fetchCustomers();
  }, []);

  const onSubmit = async (data: OrderFormData) => {
    const result = isEditing
      ? await updateOrder(order.id, data)
      : await createOrder(data);

    if (result.success) {
      toast.success(result.message ?? "Success");
      onSuccess?.(result.data as OrderWithRelations);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer & Garment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Order Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="customerId">Customer *</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingCustomers}
                >
                  <SelectTrigger
                    className={cn(errors.customerId ? "border-destructive" : "")}
                  >
                    <SelectValue
                      placeholder={
                        loadingCustomers ? "Loading customers..." : "Select a customer"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          {c.phone}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.customerId?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="garmentType">Garment Type *</Label>
            <Controller
              name="garmentType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    className={cn(errors.garmentType ? "border-destructive" : "")}
                  >
                    <SelectValue placeholder="Select garment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GARMENT_TYPES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.garmentType?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Fabric Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Fabric Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fabricName">Fabric Name</Label>
            <Input
              id="fabricName"
              placeholder="e.g. Italian Wool"
              {...register("fabricName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fabricColor">Fabric Color</Label>
            <Input
              id="fabricColor"
              placeholder="e.g. Navy Blue"
              {...register("fabricColor")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fabricQuantity">Quantity (meters)</Label>
            <Input
              id="fabricQuantity"
              type="number"
              step="0.1"
              min="0"
              placeholder="2.5"
              {...register("fabricQuantity", {
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.fabricQuantity?.message} />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate">Delivery Date *</Label>
            <Input
              id="deliveryDate"
              type="date"
              {...register("deliveryDate")}
              className={cn(errors.deliveryDate ? "border-destructive" : "")}
            />
            <FieldError message={errors.deliveryDate?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trialDate">Trial Date</Label>
            <Input id="trialDate" type="date" {...register("trialDate")} />
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Payment
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="totalAmount">Total Amount (AED) *</Label>
            <Input
              id="totalAmount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              {...register("totalAmount", { valueAsNumber: true })}
              className={cn(errors.totalAmount ? "border-destructive" : "")}
            />
            <FieldError message={errors.totalAmount?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advanceAmount">Advance Amount (AED)</Label>
            <Input
              id="advanceAmount"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              {...register("advanceAmount", { valueAsNumber: true })}
              className={cn(errors.advanceAmount ? "border-destructive" : "")}
            />
            <FieldError message={errors.advanceAmount?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Balance Due</Label>
            <div className="h-10 px-3 rounded-md border border-border bg-secondary/30 flex items-center text-sm font-medium text-[#D4AF37]">
              {formatCurrency(balanceDue)}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Notes
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="designNotes">Design Notes</Label>
            <Textarea
              id="designNotes"
              placeholder="Design specifications, embroidery details, embellishments..."
              rows={3}
              {...register("designNotes")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other instructions or reminders..."
              rows={2}
              {...register("notes")}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="gold"
          loading={isSubmitting}
          className="flex-1"
        >
          {isEditing ? "Update Order" : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
