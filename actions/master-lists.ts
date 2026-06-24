"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter } from "@/lib/branch-context";
import type { ApiResponse, TailorMaster, Salesperson, GarmentTypeMaster } from "@/types";

// ── Tailor Master ─────────────────────────────────────────────────────────────

export async function getTailorMasters(): Promise<TailorMaster[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  let q = db.from("TailorMaster").select("*").eq("isActive", true).order("name");
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());
  if (branchFilter) q = q.eq("branchId", branchFilter);

  const { data } = await q;
  return (data ?? []) as TailorMaster[];
}

export async function createTailorMaster(data: {
  name: string;
  phone?: string;
  specialization?: string;
  notes?: string;
}): Promise<ApiResponse<TailorMaster>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

  if (!data.name?.trim()) return { success: false, error: "Name is required" };

  try {
    const now = new Date().toISOString();
    const { data: tailor, error } = await db
      .from("TailorMaster")
      .insert({
        id: randomUUID(),
        name: data.name.trim(),
        phone: data.phone || null,
        specialization: data.specialization || null,
        notes: data.notes || null,
        branchId,
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

export async function getSalespersons(): Promise<Salesperson[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  let q = db.from("Salesperson").select("*").eq("isActive", true).order("name");
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());
  if (branchFilter) q = q.eq("branchId", branchFilter);

  const { data } = await q;
  return (data ?? []) as Salesperson[];
}

export async function createSalesperson(data: {
  name: string;
  phone?: string;
}): Promise<ApiResponse<Salesperson>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

  if (!data.name?.trim()) return { success: false, error: "Name is required" };

  try {
    const now = new Date().toISOString();
    const { data: sp, error } = await db
      .from("Salesperson")
      .insert({
        id: randomUUID(),
        name: data.name.trim(),
        phone: data.phone || null,
        branchId,
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

// ── Garment Type Master (global, shared across branches) ──────────────────────

export async function getGarmentTypes(): Promise<GarmentTypeMaster[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const { data } = await db
    .from("GarmentTypeMaster")
    .select("*")
    .eq("isActive", true)
    .order("name");

  return (data ?? []) as GarmentTypeMaster[];
}

export async function createGarmentType(name: string): Promise<ApiResponse<GarmentTypeMaster>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  if (!name?.trim()) return { success: false, error: "Name is required" };

  try {
    const { data: existing } = await db
      .from("GarmentTypeMaster")
      .select("id, name, isActive, createdAt")
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      if (!existing.isActive) {
        await db.from("GarmentTypeMaster").update({ isActive: true }).eq("id", existing.id);
      }
      return { success: true, data: { ...existing, isActive: true } as GarmentTypeMaster };
    }

    const { data: gt, error } = await db
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

// ── Custom Countries & Cities (global, shared across branches) ────────────────

export async function getCustomCountries(): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];
  const db = await getScopedClient(session);

  const { data } = await db.from("CustomCountry").select("name").order("name");
  return (data ?? []).map((r: any) => r.name as string);
}

export async function saveCustomCountry(name: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!name?.trim()) return;
  const db = await getScopedClient(session);

  await db
    .from("CustomCountry")
    .upsert({ id: randomUUID(), name: name.trim(), createdAt: new Date().toISOString() }, { onConflict: "name", ignoreDuplicates: true });
}

export async function getCustomCities(country?: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user) return [];
  const db = await getScopedClient(session);

  let q = db.from("CustomCity").select("name").order("name");
  if (country) q = q.eq("country", country);

  const { data } = await q;
  return (data ?? []).map((r: any) => r.name as string);
}

export async function saveCustomCity(name: string, country?: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!name?.trim()) return;
  const db = await getScopedClient(session);

  await db
    .from("CustomCity")
    .upsert({ id: randomUUID(), name: name.trim(), country: country || null, createdAt: new Date().toISOString() }, { onConflict: "name, country", ignoreDuplicates: true });

  revalidatePath("/customers");
}
