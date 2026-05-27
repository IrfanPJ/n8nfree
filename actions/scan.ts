"use server";

import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { orderStatusUpdateSchema } from "@/validators/order";
import type { OrderStatus, OrderWithRelations, ApiResponse } from "@/types";
import { POSITION_STAGE_MAP, ALL_STAGES } from "@/lib/scan-config";
import { ORDER_SELECT } from "@/lib/order-select";

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
): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  // Runtime enum validation — server actions are callable over HTTP, TypeScript types are erased
  const parsed = orderStatusUpdateSchema.safeParse({ status: newStatus });
  if (!parsed.success) return { success: false, error: "Invalid status value" };
  const validatedStatus = parsed.data.status;

  // Fetch position fresh — not from JWT which could be stale
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

  if (!allowedStages.includes(validatedStatus)) {
    return { success: false, error: "Your position does not allow setting this stage" };
  }

  // Guard against redundant scans and backwards transitions
  const { data: current } = await supabase
    .from("Order")
    .select("status")
    .eq("id", orderId)
    .eq("isActive", true)
    .maybeSingle();

  if (!current) return { success: false, error: "Order not found or inactive" };
  if (current.status === validatedStatus) {
    return { success: false, error: `Order is already in ${validatedStatus}` };
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("Order")
      .update({ status: validatedStatus, updatedAt: now })
      .eq("id", orderId);
    if (error) throw error;

    await supabase.from("OrderHistory").insert({
      id: randomUUID(),
      orderId,
      status: validatedStatus,
      notes: `Advanced to ${validatedStatus} via QR scan by ${userName}`,
      changedBy: session.user.id,
      changedAt: now,
    });

    // Fire-and-forget: activity log failure must not roll back a successful status update
    supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      orderId,
      action: "STATUS_UPDATE",
      entity: "Order",
      entityId: orderId,
      description: `Order → ${validatedStatus} via QR scan by ${userName}`,
      metadata: { status: validatedStatus, scannedBy: session.user.id, position },
    }).catch(() => {});

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/");

    return { success: true, message: `Order advanced to ${validatedStatus}` };
  } catch (error) {
    Sentry.captureException(error, { extra: { orderId, action: "processOrderScan" } });
    return { success: false, error: "Failed to update order status" };
  }
}
