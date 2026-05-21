"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { customerSchema, type CustomerFormData } from "@/validators/customer";
import { createCustomer, updateCustomer } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { Customer } from "@/types";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      city: customer?.city ?? "",
      gender: customer?.gender ?? "MALE",
      notes: customer?.notes ?? "",
      tags: customer?.tags ?? [],
      isVIP: customer?.isVIP ?? false,
    },
  });

  const isVIP = watch("isVIP");

  const onSubmit = async (data: CustomerFormData) => {
    const result = isEditing
      ? await updateCustomer(customer.id, data)
      : await createCustomer(data);

    if (result.success) {
      toast.success(result.message ?? "Success");
      onSuccess?.(result.data as Customer);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="John Smith"
            {...register("name")}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            placeholder="+91 98765 43210"
            {...register("phone")}
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select
            defaultValue={customer?.gender ?? "MALE"}
            onValueChange={(v) => setValue("gender", v as "MALE" | "FEMALE" | "OTHER")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="Mumbai" {...register("city")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" placeholder="Street address..." {...register("address")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Customer preferences, style notes, special requirements..."
          rows={3}
          {...register("notes")}
        />
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/20">
        <Switch
          id="isVIP"
          checked={isVIP}
          onCheckedChange={(v) => setValue("isVIP", v)}
        />
        <div>
          <Label htmlFor="isVIP" className="text-sm font-medium cursor-pointer">
            VIP Customer
          </Label>
          <p className="text-xs text-muted-foreground">Mark this customer as VIP for priority service</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Customer" : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}
