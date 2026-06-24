"use server";

import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import type { OrderStatus, OrderWithRelations, ApiResponse } from "@/types";
import { POSITION_STAGE_MAP, ALL_STAGES } from "@/lib/scan-config";
import { orderStatusUpdateSchema } from "@/validators/order";

const ORDER_SELECT = `
  *,
  customer:Customer!customerId(*),
  assignedTo:User!assignedToId(*),
  invoice:Invoice!orderId(*),
  statusHistory:OrderHistory!orderId(*),
  items:OrderItem!orderId(*, assignedTo:User!assignedToId(id,name,role,position))
`;

export async function getOrderForScan(orderId: string): Promise<ApiResponse<{
  order: OrderWithRelations;
  allowedStages: OrderStatus[];
  userPosition: string | null;
  userName: string;
}>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const { data: dbUser } = await db
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  const position: string | null = (dbUser as any)?.position ?? null;
  const userName: string = (dbUser as any)?.name ?? session.user.email ?? "Unknown";

  const allowedStages: OrderStatus[] =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN"
      ? ALL_STAGES
      : position
      ? (POSITION_STAGE_MAP[position] ?? [])
      : [];

  const { data: order } = await db
    .from("Order")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("isActive", true)
    .maybeSingle();

  if (!order) return { success: false, error: "Order not found or inactive" };

  return {
    success: true,
    data: {
      order: {
        ...order,
        statusHistory: ((order as any).statusHistory ?? []).sort(
          (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        ),
      } as OrderWithRelations,
      allowedStages,
      userPosition: position,
      userName,
    },
  };
}

export async function processOrderScan(
  orderId: string,
  newStatus: OrderStatus
): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const { data: dbUser } = await db
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  const position: string | null = (dbUser as any)?.position ?? null;
  const userName: string = (dbUser as any)?.name ?? session.user.email ?? "Unknown";
  const allowedStages: OrderStatus[] =
    session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN"
      ? ALL_STAGES
      : position
      ? (POSITION_STAGE_MAP[position] ?? [])
      : [];

  // Validate status is a real enum value (server action is callable over HTTP)
  const statusParsed = orderStatusUpdateSchema.safeParse({ status: newStatus });
  if (!statusParsed.success) return { success: false, error: "Invalid status value" };
  const validatedStatus = statusParsed.data.status as OrderStatus;

  if (!allowedStages.includes(validatedStatus)) {
    return { success: false, error: "Your position does not allow setting this stage" };
  }

  // Prevent scanning the same status twice (duplicate history entries)
  const { data: currentOrder } = await db
    .from("Order").select("status").eq("id", orderId).maybeSingle();
  if (currentOrder?.status === validatedStatus) {
    return { success: false, error: "Order is already in this stage" };
  }

  try {
    const now = new Date().toISOString();

    const { error } = await db
      .from("Order")
      .update({ status: validatedStatus, updatedAt: now })
      .eq("id", orderId);
    if (error) throw error;

    await db.from("OrderHistory").insert({
      id: randomUUID(),
      orderId,
      status: validatedStatus,
      notes: `Advanced to ${validatedStatus} via QR scan by ${userName}`,
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: order } = await db
      .from("Order")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .maybeSingle();

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: (order as any)?.customerId,
      orderId,
      branchId: (order as any)?.branchId,
      action: "STATUS_UPDATE",
      entity: "Order",
      entityId: orderId,
      description: `Order "${order?.orderNumber}" → ${newStatus} via QR scan`,
      metadata: { status: newStatus, scannedBy: session.user.id, position },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/");

    return {
      success: true,
      data: {
        ...order,
        statusHistory: ((order as any)?.statusHistory ?? []).sort(
          (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
        ),
      } as OrderWithRelations,
      message: `Order advanced to ${newStatus}`,
    };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update order status" };
  }
}
