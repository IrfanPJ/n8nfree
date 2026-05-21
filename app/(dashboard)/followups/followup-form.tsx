"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { followUpSchema, type FollowUpFormData } from "@/validators/followup";
import { createFollowUp, updateFollowUp } from "@/actions/followups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FollowUpWithRelations } from "@/types";

interface FollowUpFormProps {
  followUp?: FollowUpWithRelations;
  customerId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FollowUpForm({ followUp, customerId, onSuccess, onCancel }: FollowUpFormProps) {
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const isEditing = !!followUp;

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: followUp?.customerId ?? customerId ?? "",
      title: followUp?.title ?? "",
      description: followUp?.description ?? "",
      status: followUp?.status ?? "PENDING",
      priority: followUp?.priority ?? "NORMAL",
      dueDate: followUp?.dueDate ? new Date(followUp.dueDate).toISOString().split("T")[0] : "",
      notes: followUp?.notes ?? "",
    },
  });

  useEffect(() => {
    fetch("/api/customers/list")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {});
  }, []);

  const onSubmit = async (data: FollowUpFormData) => {
    const result = isEditing
      ? await updateFollowUp(followUp.id, data)
      : await createFollowUp(data);

    if (result.success) {
      toast.success(result.message ?? "Success");
      onSuccess?.();
    } else {
      toast.error(result.error ?? "Error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!customerId && (
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <Select defaultValue={followUp?.customerId} onValueChange={(v) => setValue("customerId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input placeholder="Follow-up title..." {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea placeholder="Follow-up details..." rows={2} {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select defaultValue={followUp?.priority ?? "NORMAL"} onValueChange={(v) => setValue("priority", v as FollowUpFormData["priority"])}>
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
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select defaultValue={followUp?.status ?? "PENDING"} onValueChange={(v) => setValue("status", v as FollowUpFormData["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Due Date</Label>
        <Input type="date" {...register("dueDate")} />
      </div>

      <div className="flex gap-3 pt-1">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update" : "Create"} Follow-up
        </Button>
      </div>
    </form>
  );
}
