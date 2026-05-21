"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { followUpSchema } from "@/validators/followup";
import type { ApiResponse, FollowUpWithRelations, PaginatedResult } from "@/types";

const FU_SELECT = `*, customer:Customer!customerId(*), staff:User!staffId(id, name)`;

export async function getFollowUps(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  customerId?: string;
}): Promise<PaginatedResult<FollowUpWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, priority, customerId } = params;
  const skip = (page - 1) * pageSize;

  let countQ = supabase.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = supabase.from("FollowUp").select(FU_SELECT).eq("isActive", true);

  if (customerId) { countQ = countQ.eq("customerId", customerId); dataQ = dataQ.eq("customerId", customerId); }
  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (priority) { countQ = countQ.eq("priority", priority); dataQ = dataQ.eq("priority", priority); }
  if (search) {
    countQ = countQ.ilike("title", `%${search}%`);
    dataQ = dataQ.ilike("title", `%${search}%`);
  }

  const [{ count: total }, { data }] = await Promise.all([
    countQ,
    dataQ.order("status", { ascending: true }).order("dueDate", { ascending: true }).range(skip, skip + pageSize - 1),
  ]);

  return {
    data: (data ?? []) as FollowUpWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

export async function createFollowUp(data: unknown): Promise<ApiResponse<FollowUpWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = followUpSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from("FollowUp").insert({
      id,
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      staffId: parsed.data.staffId || null,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      action: "CREATE",
      entity: "FollowUp",
      entityId: id,
      description: `Follow-up "${parsed.data.title}" created for customer`,
    });

    const { data: followUp } = await supabase.from("FollowUp").select(FU_SELECT).eq("id", id).single();
    revalidatePath("/followups");
    return { success: true, data: followUp as FollowUpWithRelations, message: "Follow-up created" };
  } catch {
    return { success: false, error: "Failed to create follow-up" };
  }
}

export async function updateFollowUp(id: string, data: unknown): Promise<ApiResponse<FollowUpWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = followUpSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const { error } = await supabase.from("FollowUp").update({
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      staffId: parsed.data.staffId || null,
      completedAt: parsed.data.status === "COMPLETED" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: followUp } = await supabase.from("FollowUp").select(FU_SELECT).eq("id", id).single();
    revalidatePath("/followups");
    return { success: true, data: followUp as FollowUpWithRelations, message: "Follow-up updated" };
  } catch {
    return { success: false, error: "Failed to update follow-up" };
  }
}

export async function deleteFollowUp(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await supabase.from("FollowUp").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/followups");
  return { success: true, message: "Follow-up deleted" };
}
