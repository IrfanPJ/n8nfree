"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { leadSchema, LEAD_STAGES } from "@/validators/lead";
import { z } from "zod";
import type { ApiResponse, Lead, LeadStage } from "@/types";

export async function getLeads(_params: { branch?: string } = {}): Promise<Lead[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase.from("Lead").select("*").eq("isActive", true).order("createdAt", { ascending: false });
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

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from("Lead").insert({
      id,
      ...leadFields(parsed.data),
      branch: "Business Bay",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    const { data: lead } = await supabase.from("Lead").select("*").eq("id", id).single();
    revalidatePath("/leads");
    return { success: true, data: lead as Lead, message: "Lead created" };
  } catch {
    return { success: false, error: "Failed to create lead" };
  }
}

export async function updateLead(id: string, data: unknown): Promise<ApiResponse<Lead>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const { error } = await supabase.from("Lead").update({
      ...leadFields(parsed.data),
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: lead } = await supabase.from("Lead").select("*").eq("id", id).single();
    revalidatePath("/leads");
    return { success: true, data: lead as Lead, message: "Lead updated" };
  } catch {
    return { success: false, error: "Failed to update lead" };
  }
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<ApiResponse<Lead>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = z.enum(LEAD_STAGES).safeParse(stage);
  if (!parsed.success) return { success: false, error: "Invalid stage value" };

  const { error } = await supabase.from("Lead").update({ stage: parsed.data, updatedAt: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: "Failed to update stage" };

  const { data: lead } = await supabase.from("Lead").select("*").eq("id", id).single();
  revalidatePath("/leads");
  return { success: true, data: lead as Lead };
}

export async function bulkCreateLeads(rows: unknown[]): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

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
        branch: "Business Bay",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  if (valid.length === 0) return { success: false, error: "No valid rows to import", data: { imported: 0, errors } };

  const { error } = await supabase.from("Lead").insert(valid);
  if (error) return { success: false, error: "Database error: " + error.message };

  revalidatePath("/leads");
  return { success: true, data: { imported: valid.length, errors }, message: `Imported ${valid.length} leads` };
}


export async function deleteLead(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  await supabase.from("Lead").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/leads");
  return { success: true, message: "Lead deleted" };
}
