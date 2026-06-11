"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import type { ApiResponse, TailorMaster, Salesperson, GarmentTypeMaster } from "@/types";

// ── Tailor Master ─────────────────────────────────────────────────────────────

export async function getTailorMasters(branch?: string): Promise<TailorMaster[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  let q = supabase.from("TailorMaster").select("*").eq("isActive", true).order("name");
  if (branch) q = q.eq("branch", branch);

  const { data } = await q;
  return (data ?? []) as TailorMaster[];
}

export async function createTailorMaster(data: {
  name: string;
  phone?: string;
  specialization?: string;
  notes?: string;
  branch?: string;
}): Promise<ApiResponse<TailorMaster>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!data.name?.trim()) return { success: false, error: "Name is required" };

  try {
    const now = new Date().toISOString();
    const { data: tailor, error } = await supabase
      .from("TailorMaster")
      .insert({
        id: randomUUID(),
        name: data.name.trim(),
        phone: data.phone || null,
        specialization: data.specialization || null,
        notes: data.notes || null,
        branch: data.branch || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: tailor as TailorMaster };
  } catch {
    return { success: false, error: "Failed to create tailor" };
  }
}

// ── Salesperson ───────────────────────────────────────────────────────────────

export async function getSalespersons(branch?: string): Promise<Salesperson[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  let q = supabase.from("Salesperson").select("*").eq("isActive", true).order("name");
  if (branch) q = q.eq("branch", branch);

  const { data } = await q;
  return (data ?? []) as Salesperson[];
}

export async function createSalesperson(data: {
  name: string;
  phone?: string;
  branch?: string;
}): Promise<ApiResponse<Salesperson>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!data.name?.trim()) return { success: false, error: "Name is required" };

  try {
    const now = new Date().toISOString();
    const { data: sp, error } = await supabase
      .from("Salesperson")
      .insert({
        id: randomUUID(),
        name: data.name.trim(),
        phone: data.phone || null,
        branch: data.branch || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: sp as Salesperson };
  } catch {
    return { success: false, error: "Failed to create salesperson" };
  }
}

// ── Garment Type Master ───────────────────────────────────────────────────────

export async function getGarmentTypes(): Promise<GarmentTypeMaster[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("GarmentTypeMaster")
    .select("*")
    .eq("isActive", true)
    .order("name");

  return (data ?? []) as GarmentTypeMaster[];
}

export async function createGarmentType(name: string): Promise<ApiResponse<GarmentTypeMaster>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!name?.trim()) return { success: false, error: "Name is required" };

  try {
    const { data: existing } = await supabase
      .from("GarmentTypeMaster")
      .select("id, name, isActive, createdAt")
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      if (!existing.isActive) {
        await supabase.from("GarmentTypeMaster").update({ isActive: true }).eq("id", existing.id);
      }
      return { success: true, data: { ...existing, isActive: true } as GarmentTypeMaster };
    }

    const { data: gt, error } = await supabase
      .from("GarmentTypeMaster")
      .insert({ id: randomUUID(), name: name.trim(), isActive: true, createdAt: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: gt as GarmentTypeMaster };
  } catch {
    return { success: false, error: "Failed to create garment type" };
  }
}

// ── Custom Countries & Cities ─────────────────────────────────────────────────

export async function getCustomCountries(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];

  const { data } = await supabase.from("CustomCountry").select("name").order("name");
  return (data ?? []).map((r: any) => r.name as string);
}

export async function saveCustomCountry(name: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!name?.trim()) return;

  await supabase
    .from("CustomCountry")
    .upsert({ id: randomUUID(), name: name.trim(), createdAt: new Date().toISOString() }, { onConflict: "name", ignoreDuplicates: true });
}

export async function getCustomCities(country?: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];

  let q = supabase.from("CustomCity").select("name").order("name");
  if (country) q = q.eq("country", country);

  const { data } = await q;
  return (data ?? []).map((r: any) => r.name as string);
}

export async function saveCustomCity(name: string, country?: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!name?.trim()) return;

  await supabase
    .from("CustomCity")
    .upsert({ id: randomUUID(), name: name.trim(), country: country || null, createdAt: new Date().toISOString() }, { onConflict: "name, country", ignoreDuplicates: true });

  revalidatePath("/customers");
}
