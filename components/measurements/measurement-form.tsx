"use client";

import React, { useEffect, useRef } from "react";
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

function Field({
  label,
  name,
  register,
  error,
  compact,
}: {
  label: string;
  name: keyof MeasurementFormData;
  register: ReturnType<typeof useForm<MeasurementFormData>>["register"];
  error?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className={cn("text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", compact && "text-[9px]")}>
        {label}
      </Label>
      <Input
        id={name}
        type="text"
        inputMode="decimal"
        placeholder="—"
        {...register(name)}
        className={cn(
          "h-8 text-sm bg-background/50 border-border/60 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20",
          error && "border-destructive"
        )}
      />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/50" />
      <h3 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest whitespace-nowrap">{title}</h3>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

const ALL_NUMERIC_FIELDS: Array<keyof MeasurementFormData> = [
  "shirtLength","shoulder","armhole","sleeve","bicep","chest","lowerChest","stomach","hip","neck","backLength","frontLength",
  "jacketSleeve","jacketLength",
  "waistcoatHalfShoulder","waistcoatLength",
  "longCoatSleeve","longCoatLength",
  "kneeLength","outseam","inseam","waist","thigh","kneeLose","ankle","rise",
  "skirtLength","skirtBottomHem",
];

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
    resolver: zodResolver(measurementSchema) as any,
    defaultValues: {
      customerId:            measurement?.customerId ?? defaultCustomerId ?? "",
      label:                 measurement?.label ?? "Standard",
      unit:                  (measurement?.unit as "inches" | "cm") ?? "inches",
      department:            measurement?.department ?? "",
      trialDate:             measurement?.trialDate ?? "",
      deliveryDate:          measurement?.deliveryDate ?? "",
      takenBy:               measurement?.takenBy ?? "",
      // Upper body
      shirtLength:           measurement?.shirtLength ?? undefined,
      shoulder:              measurement?.shoulder ?? undefined,
      armhole:               measurement?.armhole ?? undefined,
      sleeve:                measurement?.sleeve ?? undefined,
      bicep:                 measurement?.bicep ?? undefined,
      chest:                 measurement?.chest ?? undefined,
      lowerChest:            measurement?.lowerChest ?? undefined,
      stomach:               measurement?.stomach ?? undefined,
      hip:                   measurement?.hip ?? undefined,
      neck:                  measurement?.neck ?? undefined,
      backLength:            measurement?.backLength ?? undefined,
      frontLength:           measurement?.frontLength ?? undefined,
      // Jacket
      jacketSleeve:          measurement?.jacketSleeve ?? undefined,
      jacketLength:          measurement?.jacketLength ?? undefined,
      // Waistcoat
      waistcoatHalfShoulder: measurement?.waistcoatHalfShoulder ?? undefined,
      waistcoatLength:       measurement?.waistcoatLength ?? undefined,
      // Long Coat
      longCoatSleeve:        measurement?.longCoatSleeve ?? undefined,
      longCoatLength:        measurement?.longCoatLength ?? undefined,
      // Trouser
      kneeLength:            measurement?.kneeLength ?? undefined,
      outseam:               measurement?.outseam ?? undefined,
      inseam:                measurement?.inseam ?? undefined,
      waist:                 measurement?.waist ?? undefined,
      thigh:                 measurement?.thigh ?? undefined,
      kneeLose:              measurement?.kneeLose ?? undefined,
      ankle:                 measurement?.ankle ?? undefined,
      rise:                  measurement?.rise ?? undefined,
      // Skirt
      skirtLength:           measurement?.skirtLength ?? undefined,
      skirtBottomHem:        measurement?.skirtBottomHem ?? undefined,
      // Remarks
      upperRemarks:          measurement?.upperRemarks ?? "",
      lowerRemarks:          measurement?.lowerRemarks ?? "",
      fabricNotes:           measurement?.fabricNotes ?? "",
      notes:                 measurement?.notes ?? "",
    },
  });

  const unit = watch("unit");
  const prevUnitRef = useRef<string>(unit);

  useEffect(() => {
    const prev = prevUnitRef.current;
    if (prev === unit) return;
    prevUnitRef.current = unit;
    const factor = unit === "cm" ? 2.54 : 1 / 2.54;
    for (const field of ALL_NUMERIC_FIELDS) {
      const val = (watch as any)(field);
      if (val !== undefined && val !== null && val !== "") {
        const converted = Math.round(parseFloat(val) * factor * 10) / 10;
        setValue(field as any, converted as any);
      }
    }
  }, [unit]); // eslint-disable-line

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Meta ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {customers && customers.length > 0 && (
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer *</Label>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn("h-8 text-sm", errors.customerId ? "border-destructive" : "")}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="label" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Label *</Label>
          <Input id="label" placeholder="e.g. Standard, Wedding" {...register("label")} className={cn("h-8 text-sm", errors.label ? "border-destructive" : "")} />
          {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unit</Label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inches">Inches</SelectItem>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="takenBy" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Measured By</Label>
          <Input id="takenBy" placeholder="Tailor name" {...register("takenBy")} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="department" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Department</Label>
          <Input id="department" placeholder="e.g. Bespoke" {...register("department")} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="trialDate" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trial Date</Label>
          <Input id="trialDate" type="date" {...register("trialDate")} className="h-8 text-sm" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="deliveryDate" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery Date</Label>
          <Input id="deliveryDate" type="date" {...register("deliveryDate")} className="h-8 text-sm" />
        </div>
      </div>

      {/* ── Upper Body Measurement ───────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader title="Upper Body Measurement" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <Field label="Full Length"  name="shirtLength"  register={register} />
          <Field label="Shoulder"     name="shoulder"     register={register} />
          <Field label="Arm Hole"     name="armhole"      register={register} />
          <Field label="Sleeve"       name="sleeve"       register={register} />
          <Field label="Bicep"        name="bicep"        register={register} />
          <Field label="Chest"        name="chest"        register={register} />
          <Field label="Lower Chest"  name="lowerChest"   register={register} />
          <Field label="Stomach"      name="stomach"      register={register} />
          <Field label="Hip"          name="hip"          register={register} />
          <Field label="Collar"       name="neck"         register={register} />
          <Field label="Cross Back"   name="backLength"   register={register} />
          <Field label="Cross Front"  name="frontLength"  register={register} />
        </div>
      </div>

      {/* ── Jacket / Waistcoat / Long Coat ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Jacket */}
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Jacket</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sleeve"      name="jacketSleeve" register={register} compact />
            <Field label="Full Length" name="jacketLength"  register={register} compact />
          </div>
        </div>

        {/* Waistcoat */}
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Waistcoat</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Half Shoulder" name="waistcoatHalfShoulder" register={register} compact />
            <Field label="Full Length"   name="waistcoatLength"       register={register} compact />
          </div>
        </div>

        {/* Long Coat */}
        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Long Coat</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sleeve"      name="longCoatSleeve"  register={register} compact />
            <Field label="Full Length" name="longCoatLength"   register={register} compact />
          </div>
        </div>
      </div>

      {/* ── Upper Remarks + Fabric Notes ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="upperRemarks" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Upper Body Remarks</Label>
          <Textarea id="upperRemarks" placeholder="Posture notes, fitting preferences..." rows={3} {...register("upperRemarks")} className="resize-none text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fabricNotes" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comments & Fabric Details</Label>
          <Textarea id="fabricNotes" placeholder="Fabric details, special instructions..." rows={3} {...register("fabricNotes")} className="resize-none text-sm" />
        </div>
      </div>

      {/* ── Trouser Measurement ──────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader title="Trouser Measurement" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          <Field label="Knee Length"   name="kneeLength" register={register} />
          <Field label="Full Length"   name="outseam"    register={register} />
          <Field label="Inseam"        name="inseam"     register={register} />
          <Field label="Waist"         name="waist"      register={register} />
          <Field label="Hip"           name="hip"        register={register} />
          <Field label="Thigh Loose"   name="thigh"      register={register} />
          <Field label="Knee Loose"    name="kneeLose"   register={register} />
          <Field label="Bottom Hem"    name="ankle"      register={register} />
          <Field label="U-Round"       name="rise"       register={register} />
        </div>
      </div>

      {/* ── Skirt ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionHeader title="Skirt" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Length"     name="skirtLength"    register={register} />
          <Field label="Bottom Hem" name="skirtBottomHem" register={register} />
        </div>
      </div>

      {/* ── Lower Remarks ────────────────────────────────────────── */}
      <div className="space-y-1">
        <Label htmlFor="lowerRemarks" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trouser / Skirt Remarks</Label>
        <Textarea id="lowerRemarks" placeholder="Trouser or skirt fitting notes..." rows={2} {...register("lowerRemarks")} className="resize-none text-sm" />
      </div>

      {/* ── General Notes ────────────────────────────────────────── */}
      <div className="space-y-1">
        <Label htmlFor="notes" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">General Notes</Label>
        <Textarea id="notes" placeholder="Any other notes..." rows={2} {...register("notes")} className="resize-none text-sm" />
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        )}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Measurements" : "Save Measurements"}
        </Button>
      </div>
    </form>
  );
}
