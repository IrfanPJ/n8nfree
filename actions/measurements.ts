"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { measurementSchema } from "@/validators/measurement";
import type { ApiResponse, Measurement } from "@/types";

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
      label: parsed.data.label,
      unit: parsed.data.unit,
      chest: parsed.data.chest ?? null,
      waist: parsed.data.waist ?? null,
      hip: parsed.data.hip ?? null,
      shoulder: parsed.data.shoulder ?? null,
      neck: parsed.data.neck ?? null,
      sleeve: parsed.data.sleeve ?? null,
      armhole: parsed.data.armhole ?? null,
      inseam: parsed.data.inseam ?? null,
      outseam: parsed.data.outseam ?? null,
      rise: parsed.data.rise ?? null,
      thigh: parsed.data.thigh ?? null,
      ankle: parsed.data.ankle ?? null,
      backLength: parsed.data.backLength ?? null,
      frontLength: parsed.data.frontLength ?? null,
      jacketLength: parsed.data.jacketLength ?? null,
      shirtLength: parsed.data.shirtLength ?? null,
      takenBy: parsed.data.takenBy ?? session.user.name ?? null,
      notes: parsed.data.notes ?? null,
      takenAt: now,
      createdAt: now,
      updatedAt: now,
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
      label: parsed.data.label,
      unit: parsed.data.unit,
      chest: parsed.data.chest ?? null,
      waist: parsed.data.waist ?? null,
      hip: parsed.data.hip ?? null,
      shoulder: parsed.data.shoulder ?? null,
      neck: parsed.data.neck ?? null,
      sleeve: parsed.data.sleeve ?? null,
      armhole: parsed.data.armhole ?? null,
      inseam: parsed.data.inseam ?? null,
      outseam: parsed.data.outseam ?? null,
      rise: parsed.data.rise ?? null,
      thigh: parsed.data.thigh ?? null,
      ankle: parsed.data.ankle ?? null,
      backLength: parsed.data.backLength ?? null,
      frontLength: parsed.data.frontLength ?? null,
      jacketLength: parsed.data.jacketLength ?? null,
      shirtLength: parsed.data.shirtLength ?? null,
      takenBy: parsed.data.takenBy ?? null,
      notes: parsed.data.notes ?? null,
      updatedAt: new Date().toISOString(),
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
    const { data: measurement } = await supabase.from("Measurement").select("customerId").eq("id", id).single();
    await supabase.from("Measurement").delete().eq("id", id);
    revalidatePath("/measurements");
    if (measurement?.customerId) revalidatePath(`/customers/${measurement.customerId}`);
    return { success: true, message: "Measurement deleted" };
  } catch {
    return { success: false, error: "Failed to delete measurement" };
  }
}
