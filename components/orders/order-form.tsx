"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { orderSchema, type OrderFormData } from "@/validators/order";
import { createOrder, updateOrder } from "@/actions/orders";
import { getAssignableStaff } from "@/actions/users";
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
import { getCustomers, createCustomer } from "@/actions/customers";
import type { OrderWithRelations, Customer } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { UserPlus, X, Plus, Trash2 } from "lucide-react";

interface OrderFormProps {
  order?: OrderWithRelations;
  defaultCustomerId?: string;
  onSuccess?: (order: OrderWithRelations) => void;
  onCancel?: () => void;
}

const GARMENT_TYPES = [
  "Suit",
  "Jacket",
  "Blazer",
  "Shirt",
  "Trousers",
  "Waistcoat",
  "Tie",
  "Kandura",
  "Sherwani",
  "Other",
];

type StaffMember = { id: string; name: string; role: string; position: string | null; isActive: boolean };

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [balanceDue, setBalanceDue] = useState(0);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  const defaultItems = order?.items?.length
    ? order.items.map((item) => ({
        id: item.id,
        garmentType: item.garmentType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        assignedToId: item.assignedToId ?? "",
        notes: item.notes ?? "",
        sortOrder: item.sortOrder,
      }))
    : [{ garmentType: "", quantity: 1, unitPrice: 0, assignedToId: "", notes: "", sortOrder: 0 }];

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
      items: defaultItems,
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

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const totalAmount = watch("totalAmount");
  const advanceAmount = watch("advanceAmount");

  // Auto-calculate total from items
  useEffect(() => {
    const sum = (watchedItems ?? []).reduce((acc, item) => {
      return acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    }, 0);
    if (sum > 0) setValue("totalAmount", sum);
  }, [JSON.stringify(watchedItems?.map((i) => ({ q: i.quantity, p: i.unitPrice })))]); // eslint-disable-line

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const advance = Number(advanceAmount) || 0;
    setBalanceDue(Math.max(0, total - advance));
  }, [totalAmount, advanceAmount]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersResult, staffResult] = await Promise.all([
          getCustomers({ pageSize: 200 }),
          getAssignableStaff(),
        ]);
        setCustomers(customersResult.data);
        if (staffResult.success) setStaff(staffResult.data);
      } catch {
        toast.error("Failed to load form data");
      } finally {
        setLoadingCustomers(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveNewClient = async () => {
    if (!newClientName.trim()) { toast.error("Name is required"); return; }
    if (!newClientPhone.trim()) { toast.error("Phone is required"); return; }
    setSavingClient(true);
    const result = await createCustomer({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      email: newClientEmail.trim() || undefined,
      gender: "MALE",
      tags: [],
      isVIP: false,
    });
    if (result.success && result.data) {
      const c = result.data as Customer;
      setCustomers((prev) => [c, ...prev]);
      setValue("customerId", c.id);
      setShowAddClient(false);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      toast.success(`${c.name} added to client book`);
    } else {
      toast.error(result.error ?? "Failed to save client");
    }
    setSavingClient(false);
  };

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

  const tailorOptions = staff.filter((s) =>
    ["MASTER", "TAILOR"].includes(s.position ?? "") || s.role !== "STAFF"
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
          Order Details
        </h3>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="customerId">Customer *</Label>
            <button
              type="button"
              onClick={() => setShowAddClient((v) => !v)}
              className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
            >
              {showAddClient ? (
                <><X className="w-3 h-3" /> Cancel</>
              ) : (
                <><UserPlus className="w-3 h-3" /> New Client</>
              )}
            </button>
          </div>

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

          {showAddClient && (
            <div className="mt-2 p-4 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/5 space-y-3">
              <p className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Add New Client
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    placeholder="e.g. Ahmed Al Mansouri"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    placeholder="+971 50 123 4567"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Email (optional)</Label>
                  <Input
                    placeholder="email@example.com"
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={handleSaveNewClient}
                loading={savingClient}
                className="w-full gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Save to Client Book
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="space-y-1.5">
            <Label>Responsible Tailor</Label>
            <Controller
              name="assignedToId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign overall tailor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.position && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({s.position.replace(/_/g, " ")})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Garment Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">
            Garment Items
          </h3>
          <button
            type="button"
            onClick={() =>
              append({ garmentType: "", quantity: 1, unitPrice: 0, assignedToId: "", notes: "", sortOrder: fields.length })
            }
            className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
        {(errors.items as any)?.message && (
          <p className="text-xs text-destructive">{(errors.items as any).message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-secondary/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Item {index + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Garment Type *</Label>
                  <Controller
                    name={`items.${index}.garmentType`}
                    control={control}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger
                          className={cn(
                            "h-9 text-sm",
                            errors.items?.[index]?.garmentType ? "border-destructive" : ""
                          )}
                        >
                          <SelectValue placeholder="Select type" />
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
                  <FieldError message={errors.items?.[index]?.garmentType?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tailor</Label>
                  <Controller
                    name={`items.${index}.assignedToId`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        value={f.value || "__none__"}
                        onValueChange={(v) => f.onChange(v === "__none__" ? "" : v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Assign tailor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Unassigned —</SelectItem>
                          {tailorOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    className="h-9 text-sm"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />
                  <FieldError message={errors.items?.[index]?.quantity?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Price (AED)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="h-9 text-sm"
                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                  <FieldError message={errors.items?.[index]?.unitPrice?.message} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Item Notes</Label>
                <Input
                  placeholder="Specific instructions for this garment..."
                  className="h-8 text-sm"
                  {...register(`items.${index}.notes`)}
                />
              </div>
            </div>
          ))}
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
              {...register("fabricQuantity", { valueAsNumber: true })}
            />
            <FieldError message={errors.fabricQuantity?.message} />
          </div>
        </div>
      </div>

      {/* Schedule */}
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
