"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter, NO_ACTIVE_BRANCH_ERROR } from "@/lib/branch-context";
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
  const db = await getScopedClient(session);

  const { page = 1, pageSize = 20, search, status, priority, customerId } = params;
  const skip = (page - 1) * pageSize;
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let countQ = db.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = db.from("FollowUp").select(FU_SELECT).eq("isActive", true);

  if (branchFilter) { countQ = countQ.eq("branchId", branchFilter); dataQ = dataQ.eq("branchId", branchFilter); }
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
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());
  if (!branchId) return { success: false, error: NO_ACTIVE_BRANCH_ERROR };

  const parsed = followUpSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await db.from("FollowUp").insert({
      id,
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      staffId: parsed.data.staffId || null,
      branchId,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      branchId,
      action: "CREATE",
      entity: "FollowUp",
      entityId: id,
      description: `Follow-up "${parsed.data.title}" created for customer`,
    });

    const { data: followUp } = await db.from("FollowUp").select(FU_SELECT).eq("id", id).single();
    revalidatePath("/followups");
    return { success: true, data: followUp as FollowUpWithRelations, message: "Follow-up created" };
  } catch {
    return { success: false, error: "Failed to create follow-up" };
  }
}

export async function updateFollowUp(id: string, data: unknown): Promise<ApiResponse<FollowUpWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = followUpSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const { data: existing } = await db.from("FollowUp").select("completedAt, status").eq("id", id).maybeSingle();
    // Only set completedAt when transitioning INTO completed; preserve it if already completed; clear it if re-opened
    const wasCompleted = existing?.status === "COMPLETED";
    const isNowCompleted = parsed.data.status === "COMPLETED";
    const completedAt = isNowCompleted
      ? (wasCompleted ? existing.completedAt : new Date().toISOString())
      : null;

    const { error } = await db.from("FollowUp").update({
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate).toISOString() : null,
      staffId: parsed.data.staffId || null,
      completedAt,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: followUp } = await db.from("FollowUp").select(FU_SELECT).eq("id", id).single();
    revalidatePath("/followups");
    return { success: true, data: followUp as FollowUpWithRelations, message: "Follow-up updated" };
  } catch {
    return { success: false, error: "Failed to update follow-up" };
  }
}

export async function deleteFollowUp(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  await db.from("FollowUp").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/followups");
  return { success: true, message: "Follow-up deleted" };
}
