"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter } from "@/lib/branch-context";
import { leadSchema, LEAD_STAGES } from "@/validators/lead";
import { z } from "zod";
import type { ApiResponse, Lead, LeadStage } from "@/types";

export async function getLeads(): Promise<Lead[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let q = db.from("Lead").select("*").eq("isActive", true);
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("createdAt", { ascending: false });
  return (data ?? []) as Lead[];
}

function leadFields(d: ReturnType<typeof leadSchema.parse>) {
  return {
    name:          d.name,
    phone:         d.phone || null,
    email:         d.email || null,
    interest:      d.interest || null,
    stage:         d.stage,
    notes:         d.notes || null,
    value:         d.value,
    source:        d.source || null,
    category:      d.category ?? null,
    handler:       d.handler || null,
    transferredTo: d.transferredTo || null,
    visited:       d.visited ?? false,
    followup:      d.followup ?? false,
    leadDate:      d.leadDate || null,
  };
}

export async function createLead(data: unknown): Promise<ApiResponse<Lead>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await db.from("Lead").insert({
      id,
      ...leadFields(parsed.data),
      branchId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    const { data: lead } = await db.from("Lead").select("*").eq("id", id).single();
    revalidatePath("/leads");
    return { success: true, data: lead as Lead, message: "Lead created" };
  } catch {
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: unknown): Promise<ApiResponse<Lead>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const { error } = await db.from("Lead").update({
      ...leadFields(parsed.data),
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: lead } = await db.from("Lead").select("*").eq("id", id).single();
    revalidatePath("/leads");
    return { success: true, data: lead as Lead, message: "Lead updated" };
  } catch {
    return { success: false, error: "Failed to update lead" };
  }
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<ApiResponse<Lead>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = z.enum(LEAD_STAGES).safeParse(stage);
  if (!parsed.success) return { success: false, error: "Invalid stage value" };

  const { error } = await db.from("Lead").update({ stage: parsed.data, updatedAt: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: "Failed to update stage" };

  const { data: lead } = await db.from("Lead").select("*").eq("id", id).single();
  revalidatePath("/leads");
  return { success: true, data: lead as Lead };
}

export async function bulkCreateLeads(rows: unknown[]): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

  const now = new Date().toISOString();
  const valid: object[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = leadSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "Invalid"}`);
    } else {
      valid.push({
        id: randomUUID(),
        ...leadFields(parsed.data),
        branchId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (valid.length === 0) return { success: false, error: "No valid rows to import", data: { imported: 0, errors } };

  const { error } = await db.from("Lead").insert(valid);
  if (error) return { success: false, error: "Database error: " + error.message };

  revalidatePath("/leads");
  return { success: true, data: { imported: valid.length, errors }, message: `Imported ${valid.length} leads` };
}


export async function deleteLead(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }
  const db = await getScopedClient(session);

  await db.from("Lead").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/leads");
  return { success: true, message: "Lead deleted" };
}
