"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  appointmentSchema,
  type AppointmentFormData,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
} from "@/validators/appointment";
import { createAppointment, updateAppointment } from "@/actions/appointments";
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
import type { AppointmentWithRelations, Customer, User } from "@/types";
import { cn } from "@/lib/utils";

interface AppointmentFormProps {
  appointment?: AppointmentWithRelations;
  customers?: Customer[];
  staff?: User[];
  defaultCustomerId?: string;
  defaultDate?: Date;
  onSuccess?: (appointment: AppointmentWithRelations) => void;
  onCancel?: () => void;
}

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
] as const;

function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function AppointmentForm({
  appointment,
  customers,
  staff,
  defaultCustomerId,
  defaultDate,
  onSuccess,
  onCancel,
}: AppointmentFormProps) {
  const isEditing = !!appointment;

  const defaultStart = appointment
    ? toDatetimeLocal(appointment.startTime)
    : defaultDate
    ? format(defaultDate, "yyyy-MM-dd'T'09:00")
    : format(new Date(), "yyyy-MM-dd'T'09:00");

  const defaultEnd = appointment
    ? toDatetimeLocal(appointment.endTime)
    : defaultDate
    ? format(defaultDate, "yyyy-MM-dd'T'10:00")
    : format(new Date(), "yyyy-MM-dd'T'10:00");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: appointment?.customerId ?? defaultCustomerId ?? "",
      staffId: appointment?.staffId ?? "",
      title: appointment?.title ?? "",
      description: appointment?.description ?? "",
      type: (appointment?.type as AppointmentFormData["type"]) ?? "FITTING",
      status: appointment?.status ?? "SCHEDULED",
      startTime: defaultStart,
      endTime: defaultEnd,
      location: appointment?.location ?? "",
      notes: appointment?.notes ?? "",
      reminderAt: appointment?.reminderAt ? toDatetimeLocal(appointment.reminderAt) : "",
    },
  });

  const onSubmit = async (data: AppointmentFormData) => {
    const result = isEditing
      ? await updateAppointment(appointment.id, data)
      : await createAppointment(data);

    if (result.success) {
      toast.success(result.message ?? "Appointment saved");
      onSuccess?.(result.data as AppointmentWithRelations);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer */}
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

        {/* Appointment Type */}
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {APPOINTMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="e.g. Suit fitting for Mr. Sharma"
            {...register("title")}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* Start Time */}
        <div className="space-y-1.5">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            {...register("startTime")}
            className={errors.startTime ? "border-destructive" : ""}
          />
          {errors.startTime && (
            <p className="text-xs text-destructive">{errors.startTime.message}</p>
          )}
        </div>

        {/* End Time */}
        <div className="space-y-1.5">
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            {...register("endTime")}
            className={errors.endTime ? "border-destructive" : ""}
          />
          {errors.endTime && (
            <p className="text-xs text-destructive">{errors.endTime.message}</p>
          )}
        </div>

        {/* Status */}
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

        {/* Staff */}
        {staff && staff.length > 0 && (
          <div className="space-y-1.5">
            <Label>Assigned Staff</Label>
            <Controller
              name="staffId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to staff (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name ?? s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="e.g. Shop, Studio 1, Client's address"
            {...register("location")}
          />
        </div>

        {/* Reminder */}
        <div className="space-y-1.5">
          <Label htmlFor="reminderAt">Reminder</Label>
          <Input
            id="reminderAt"
            type="datetime-local"
            {...register("reminderAt")}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Appointment details, garment to be fitted, special instructions..."
          rows={2}
          {...register("description")}
          className="resize-none"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Internal Notes</Label>
        <Textarea
          id="notes"
          placeholder="Internal staff notes..."
          rows={2}
          {...register("notes")}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Appointment" : "Schedule Appointment"}
        </Button>
      </div>
    </form>
  );
}
