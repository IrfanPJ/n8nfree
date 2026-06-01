"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { leadSchema } from "@/validators/lead";
import type { ApiResponse, Lead, LeadStage } from "@/types";

export async function getLeads(params: { branch?: string } = {}): Promise<Lead[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  let q = supabase.from("Lead").select("*").eq("isActive", true);

  if (params.branch && params.branch !== "All Branches") {
    q = q.eq("branch", params.branch);
  }

  const { data } = await q.order("createdAt", { ascending: false });
  return (data ?? []) as Lead[];
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
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      interest: parsed.data.interest || null,
      stage: parsed.data.stage,
      notes: parsed.data.notes || null,
      value: parsed.data.value,
      source: parsed.data.source || null,
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
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      interest: parsed.data.interest || null,
      stage: parsed.data.stage,
      notes: parsed.data.notes || null,
      value: parsed.data.value,
      source: parsed.data.source || null,
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

  const { error } = await supabase.from("Lead").update({
    stage,
    updatedAt: new Date().toISOString(),
  }).eq("id", id);

  if (error) return { success: false, error: "Failed to update stage" };

  const { data: lead } = await supabase.from("Lead").select("*").eq("id", id).single();
  revalidatePath("/leads");
  return { success: true, data: lead as Lead };
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
