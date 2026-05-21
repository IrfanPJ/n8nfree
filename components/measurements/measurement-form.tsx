"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { measurementSchema, type MeasurementFormData } from "@/validators/measurement";
import { createMeasurement, updateMeasurement } from "@/actions/measurements";
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
import { cn } from "@/lib/utils";
import type { Measurement, Customer } from "@/types";

interface MeasurementFormProps {
  measurement?: Measurement;
  customers?: Customer[];
  defaultCustomerId?: string;
  onSuccess?: (measurement: Measurement) => void;
  onCancel?: () => void;
}

interface MeasurementFieldProps {
  label: string;
  name: keyof MeasurementFormData;
  register: ReturnType<typeof useForm<MeasurementFormData>>["register"];
  unit: string;
  error?: string;
}

function MeasurementField({ label, name, register, unit, error }: MeasurementFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={name}
          type="number"
          step="0.1"
          min="0"
          placeholder="0.0"
          {...register(name)}
          className={cn(
            "pr-12 bg-background/50 border-border/60 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20 text-sm",
            error && "border-destructive"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {unit}
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function MeasurementForm({
  measurement,
  customers,
  defaultCustomerId,
  onSuccess,
  onCancel,
}: MeasurementFormProps) {
  const isEditing = !!measurement;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: measurement?.customerId ?? defaultCustomerId ?? "",
      label: measurement?.label ?? "Standard",
      unit: (measurement?.unit as "inches" | "cm") ?? "inches",
      chest: measurement?.chest ?? undefined,
      waist: measurement?.waist ?? undefined,
      hip: measurement?.hip ?? undefined,
      shoulder: measurement?.shoulder ?? undefined,
      neck: measurement?.neck ?? undefined,
      sleeve: measurement?.sleeve ?? undefined,
      armhole: measurement?.armhole ?? undefined,
      inseam: measurement?.inseam ?? undefined,
      outseam: measurement?.outseam ?? undefined,
      rise: measurement?.rise ?? undefined,
      thigh: measurement?.thigh ?? undefined,
      ankle: measurement?.ankle ?? undefined,
      backLength: measurement?.backLength ?? undefined,
      frontLength: measurement?.frontLength ?? undefined,
      jacketLength: measurement?.jacketLength ?? undefined,
      shirtLength: measurement?.shirtLength ?? undefined,
      takenBy: measurement?.takenBy ?? "",
      notes: measurement?.notes ?? "",
    },
  });

  const unit = watch("unit");

  const onSubmit = async (data: MeasurementFormData) => {
    const result = isEditing
      ? await updateMeasurement(measurement.id, data)
      : await createMeasurement(data);

    if (result.success) {
      toast.success(result.message ?? "Measurement saved");
      onSuccess?.(result.data as Measurement);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  const upperBodyFields: Array<{ label: string; name: keyof MeasurementFormData }> = [
    { label: "Chest", name: "chest" },
    { label: "Waist", name: "waist" },
    { label: "Hip", name: "hip" },
    { label: "Shoulder", name: "shoulder" },
    { label: "Neck", name: "neck" },
    { label: "Sleeve", name: "sleeve" },
    { label: "Armhole", name: "armhole" },
  ];

  const lowerBodyFields: Array<{ label: string; name: keyof MeasurementFormData }> = [
    { label: "Inseam", name: "inseam" },
    { label: "Outseam", name: "outseam" },
    { label: "Rise", name: "rise" },
    { label: "Thigh", name: "thigh" },
    { label: "Ankle", name: "ankle" },
  ];

  const lengthFields: Array<{ label: string; name: keyof MeasurementFormData }> = [
    { label: "Back Length", name: "backLength" },
    { label: "Front Length", name: "frontLength" },
    { label: "Jacket Length", name: "jacketLength" },
    { label: "Shirt Length", name: "shirtLength" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Meta Fields */}
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
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            placeholder="e.g. Standard, Wedding, Summer"
            {...register("label")}
            className={errors.label ? "border-destructive" : ""}
          />
          {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Unit</Label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inches">Inches</SelectItem>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="takenBy">Measured By</Label>
          <Input id="takenBy" placeholder="Tailor name" {...register("takenBy")} />
        </div>
      </div>

      {/* Upper Body */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/50" />
          <h3 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
            Upper Body
          </h3>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {upperBodyFields.map((f) => (
            <MeasurementField
              key={f.name}
              label={f.label}
              name={f.name}
              register={register}
              unit={unit}
              error={errors[f.name]?.message}
            />
          ))}
        </div>
      </div>

      {/* Lower Body */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/50" />
          <h3 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
            Lower Body
          </h3>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {lowerBodyFields.map((f) => (
            <MeasurementField
              key={f.name}
              label={f.label}
              name={f.name}
              register={register}
              unit={unit}
              error={errors[f.name]?.message}
            />
          ))}
        </div>
      </div>

      {/* Lengths */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/50" />
          <h3 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
            Lengths
          </h3>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {lengthFields.map((f) => (
            <MeasurementField
              key={f.name}
              label={f.label}
              name={f.name}
              register={register}
              unit={unit}
              error={errors[f.name]?.message}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Posture notes, special instructions, fitting preferences..."
          rows={3}
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
          {isEditing ? "Update Measurements" : "Save Measurements"}
        </Button>
      </div>
    </form>
  );
}
