"use server";

import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import type { OrderStatus, OrderWithRelations, ApiResponse } from "@/types";

export const POSITION_STAGE_MAP: Record<string, OrderStatus[]> = {
  SALES_STAFF:           ["MEASUREMENT", "TRIAL"],
  LEAD_MANAGEMENT_STAFF: ["MEASUREMENT", "TRIAL"],
  PURCHASE_STAFF:        ["FABRIC_ORDERING", "FABRIC_COLLECTED"],
  PRODUCTION_IN_CHARGE:  ["CUTTING", "SEMI_STITCH", "FINAL_STITCH", "PENDING_ALTERATION"],
  MASTER:                ["CUTTING"],
  TAILOR:                ["SEMI_STITCH", "FINAL_STITCH"],
  QUALITY_CHECK:         ["TRIAL", "READY_FOR_DELIVERY", "PENDING_ALTERATION", "READY_FINAL_DELIVERY"],
  LOGISTICS_COORDINATOR: ["DELIVERED", "ORDER_CLOSED"],
};

// All 12 stages in order (for admin full picker)
export const ALL_STAGES: OrderStatus[] = [
  "MEASUREMENT", "FABRIC_ORDERING", "FABRIC_COLLECTED", "CUTTING",
  "SEMI_STITCH", "TRIAL", "FINAL_STITCH", "READY_FOR_DELIVERY",
  "DELIVERED", "PENDING_ALTERATION", "READY_FINAL_DELIVERY", "ORDER_CLOSED",
];

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

  const { data: dbUser } = await supabase
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  const position: string | null = (dbUser as any)?.position ?? null;
  const userName: string = (dbUser as any)?.name ?? session.user.email ?? "Unknown";

  const allowedStages: OrderStatus[] =
    session.user.role === "ADMIN"
      ? ALL_STAGES
      : position
      ? (POSITION_STAGE_MAP[position] ?? [])
      : [];

  const { data: order } = await supabase
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

  const { data: dbUser } = await supabase
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  const position: string | null = (dbUser as any)?.position ?? null;
  const userName: string = (dbUser as any)?.name ?? session.user.email ?? "Unknown";
  const allowedStages: OrderStatus[] =
    session.user.role === "ADMIN"
      ? ALL_STAGES
      : position
      ? (POSITION_STAGE_MAP[position] ?? [])
      : [];

  if (!allowedStages.includes(newStatus)) {
    return { success: false, error: "Your position does not allow setting this stage" };
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("Order")
      .update({ status: newStatus, updatedAt: now })
      .eq("id", orderId);
    if (error) throw error;

    await supabase.from("OrderHistory").insert({
      id: randomUUID(),
      orderId,
      status: newStatus,
      notes: `Advanced to ${newStatus} via QR scan by ${userName}`,
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: order } = await supabase
      .from("Order")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .maybeSingle();

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: (order as any)?.customerId,
      orderId,
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
