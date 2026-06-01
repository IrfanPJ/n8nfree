"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { fabricSchema } from "@/validators/fabric";
import type { ApiResponse, Fabric } from "@/types";

export async function getFabrics(params: {
  search?: string;
  lowStockOnly?: boolean;
  branch?: string;
} = {}): Promise<Fabric[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  let q = supabase.from("Fabric").select("*").eq("isActive", true);

  if (params.search) q = q.ilike("name", `%${params.search}%`);

  const { data } = await q.order("name", { ascending: true });
  const fabrics = (data ?? []) as Fabric[];

  if (params.lowStockOnly) {
    return fabrics.filter((f) => f.stockQty <= f.reorderLevel);
  }

  return fabrics;
}

export async function createFabric(data: unknown): Promise<ApiResponse<Fabric>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = fabricSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from("Fabric").insert({
      id,
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color || null,
      stockQty: parsed.data.stockQty,
      reorderLevel: parsed.data.reorderLevel,
      supplier: parsed.data.supplier || null,
      pricePerUnit: parsed.data.pricePerUnit,
      unit: parsed.data.unit,
      notes: parsed.data.notes || null,
      branch: "Business Bay",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    const { data: fabric } = await supabase.from("Fabric").select("*").eq("id", id).single();
    revalidatePath("/fabrics");
    return { success: true, data: fabric as Fabric, message: "Fabric added" };
  } catch {
    return { success: false, error: "Failed to add fabric" };
  }
}

export async function updateFabric(id: string, data: unknown): Promise<ApiResponse<Fabric>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = fabricSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const { error } = await supabase.from("Fabric").update({
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color || null,
      stockQty: parsed.data.stockQty,
      reorderLevel: parsed.data.reorderLevel,
      supplier: parsed.data.supplier || null,
      pricePerUnit: parsed.data.pricePerUnit,
      unit: parsed.data.unit,
      notes: parsed.data.notes || null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: fabric } = await supabase.from("Fabric").select("*").eq("id", id).single();
    revalidatePath("/fabrics");
    return { success: true, data: fabric as Fabric, message: "Fabric updated" };
  } catch {
    return { success: false, error: "Failed to update fabric" };
  }
}

export async function adjustStock(id: string, delta: number, notes?: string): Promise<ApiResponse<Fabric>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const { data: existing } = await supabase.from("Fabric").select("stockQty").eq("id", id).single();
  if (!existing) return { success: false, error: "Fabric not found" };

  const newQty = Math.max(0, existing.stockQty + delta);

  const { error } = await supabase.from("Fabric").update({
    stockQty: newQty,
    updatedAt: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { success: false, error: "Failed to adjust stock" };

  const { data: fabric } = await supabase.from("Fabric").select("*").eq("id", id).single();
  revalidatePath("/fabrics");
  return { success: true, data: fabric as Fabric, message: `Stock updated to ${newQty}` };
}

export async function deleteFabric(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  await supabase.from("Fabric").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/fabrics");
  return { success: true, message: "Fabric removed" };
}
