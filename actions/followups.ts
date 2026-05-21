"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { followUpSchema } from "@/validators/followup";
import type { ApiResponse, FollowUpWithRelations, PaginatedResult } from "@/types";

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

  const where = {
    isActive: true,
    ...(customerId && { customerId }),
    ...(status && { status: status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }),
    ...(priority && { priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        customer: true,
        staff: { select: { id: true, name: true } },
      },
    }),
    prisma.followUp.count({ where }),
  ]);

  return {
    data: data as FollowUpWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createFollowUp(data: unknown): Promise<ApiResponse<FollowUpWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = followUpSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  try {
    const followUp = await prisma.followUp.create({
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        staffId: parsed.data.staffId || null,
      },
      include: { customer: true, staff: { select: { id: true, name: true } } },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: followUp.customerId,
        action: "CREATE",
        entity: "FollowUp",
        entityId: followUp.id,
        description: `Follow-up "${followUp.title}" created for customer`,
      },
    });

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
    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        staffId: parsed.data.staffId || null,
        completedAt: parsed.data.status === "COMPLETED" ? new Date() : undefined,
      },
      include: { customer: true, staff: { select: { id: true, name: true } } },
    });

    revalidatePath("/followups");
    return { success: true, data: followUp as FollowUpWithRelations, message: "Follow-up updated" };
  } catch {
    return { success: false, error: "Failed to update follow-up" };
  }
}

export async function deleteFollowUp(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await prisma.followUp.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/followups");
  return { success: true, message: "Follow-up deleted" };
}
