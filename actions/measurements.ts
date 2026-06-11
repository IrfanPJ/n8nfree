"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { measurementSchema } from "@/validators/measurement";
import type { ApiResponse, Measurement } from "@/types";

function measurementFields(d: ReturnType<typeof measurementSchema.parse>) {
  return {
    label: d.label,
    unit: d.unit,
    // Upper body
    shirtLength: d.shirtLength ?? null,
    shoulder: d.shoulder ?? null,
    armhole: d.armhole ?? null,
    sleeve: d.sleeve ?? null,
    bicep: d.bicep ?? null,
    chest: d.chest ?? null,
    lowerChest: d.lowerChest ?? null,
    stomach: d.stomach ?? null,
    hip: d.hip ?? null,
    neck: d.neck ?? null,
    backLength: d.backLength ?? null,
    frontLength: d.frontLength ?? null,
    // Jacket
    jacketSleeve: d.jacketSleeve ?? null,
    jacketLength: d.jacketLength ?? null,
    // Waistcoat
    waistcoatHalfShoulder: d.waistcoatHalfShoulder ?? null,
    waistcoatLength: d.waistcoatLength ?? null,
    // Long Coat
    longCoatSleeve: d.longCoatSleeve ?? null,
    longCoatLength: d.longCoatLength ?? null,
    // Trouser
    kneeLength: d.kneeLength ?? null,
    outseam: d.outseam ?? null,
    inseam: d.inseam ?? null,
    waist: d.waist ?? null,
    thigh: d.thigh ?? null,
    kneeLose: d.kneeLose ?? null,
    ankle: d.ankle ?? null,
    rise: d.rise ?? null,
    // Skirt
    skirtLength: d.skirtLength ?? null,
    skirtBottomHem: d.skirtBottomHem ?? null,
    // Meta
    department: d.department ?? null,
    trialDate: d.trialDate ?? null,
    deliveryDate: d.deliveryDate ?? null,
    // Remarks
    upperRemarks: d.upperRemarks ?? null,
    lowerRemarks: d.lowerRemarks ?? null,
    fabricNotes: d.fabricNotes ?? null,
    notes: d.notes ?? null,
    // Images
    imageUrls: d.imageUrls ?? [],
  };
}

export async function getMeasurements(customerId?: string): Promise<Measurement[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    let q = supabase.from("Measurement").select("*").order("takenAt", { ascending: false });
    if (customerId) q = q.eq("customerId", customerId);
    const { data } = await q;
    return (data ?? []) as Measurement[];
  } catch {
    return [];
  }
}

export async function getMeasurementById(id: string): Promise<Measurement | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    const { data } = await supabase.from("Measurement").select("*").eq("id", id).maybeSingle();
    return data as Measurement | null;
  } catch {
    return null;
  }
}

export async function createMeasurement(data: unknown): Promise<ApiResponse<Measurement>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = measurementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { data: measurement, error } = await supabase.from("Measurement").insert({
      id,
      customerId: parsed.data.customerId,
      takenBy: parsed.data.takenBy ?? session.user.name ?? null,
      takenAt: now,
      createdAt: now,
      updatedAt: now,
      ...measurementFields(parsed.data),
    }).select().single();

    if (error) throw error;

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      action: "CREATE",
      entity: "Measurement",
      entityId: id,
      description: `Measurement "${parsed.data.label}" recorded`,
    });

    revalidatePath("/measurements");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true, data: measurement as Measurement, message: "Measurement saved successfully" };
  } catch (error) {
    console.error("Create measurement error:", error);
    return { success: false, error: "Failed to save measurement" };
  }
}

export async function updateMeasurement(id: string, data: unknown): Promise<ApiResponse<Measurement>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = measurementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const { data: measurement, error } = await supabase.from("Measurement").update({
      takenBy: parsed.data.takenBy ?? null,
      updatedAt: new Date().toISOString(),
      ...measurementFields(parsed.data),
    }).eq("id", id).select().single();

    if (error) throw error;

    revalidatePath("/measurements");
    revalidatePath(`/customers/${measurement.customerId}`);
    return { success: true, data: measurement as Measurement, message: "Measurement updated successfully" };
  } catch (error) {
    console.error("Update measurement error:", error);
    return { success: false, error: "Failed to update measurement" };
  }
}

export async function deleteMeasurement(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { data: measurement } = await supabase.from("Measurement").select("customerId").eq("id", id).maybeSingle();
    if (!measurement) return { success: false, error: "Measurement not found" };
    await supabase.from("Measurement").delete().eq("id", id);
    revalidatePath("/measurements");
    if (measurement.customerId) revalidatePath(`/customers/${measurement.customerId}`);
    return { success: true, message: "Measurement deleted" };
  } catch {
    return { success: false, error: "Failed to delete measurement" };
  }
}
