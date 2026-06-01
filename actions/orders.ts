"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { getDbClient } from "@/lib/supabase-branch";
import { auth } from "@/lib/auth";
import { orderSchema, orderStatusUpdateSchema } from "@/validators/order";
import { generateOrderNumber } from "@/lib/utils";
import { getBranchFilter } from "@/lib/branch";
import * as Sentry from "@sentry/nextjs";
import { sendOrderStatusUpdate } from "@/lib/email";
import type { ApiResponse, OrderWithRelations, PaginatedResult, OrderStatus } from "@/types";

const ORDER_SELECT = `
  *,
  customer:Customer!customerId(*),
  assignedTo:User!assignedToId(*),
  invoice:Invoice!orderId(*),
  statusHistory:OrderHistory!orderId(*),
  items:OrderItem!orderId(*, assignedTo:User!assignedToId(id,name,role,position))
`;

export async function getOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  branch?: string;
  cursor?: string; // createdAt ISO string of last item for cursor-based pagination
}): Promise<PaginatedResult<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, priority, branch, cursor } = params;

  const db = await getDbClient(session.user.role, (session.user as any).branch ?? "Main");
  let countQ = db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = db.from("Order").select(ORDER_SELECT).eq("isActive", true);

  // Admin/Manager: optional URL-param branch filter; non-admins: RLS handles it
  const branchFilter = getBranchFilter(session.user as any, branch);
  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (priority) { countQ = countQ.eq("priority", priority); dataQ = dataQ.eq("priority", priority); }
  if (branchFilter) { countQ = countQ.eq("branch", branchFilter); dataQ = dataQ.eq("branch", branchFilter); }
  if (search) {
    const f = `orderNumber.ilike.%${search}%,garmentType.ilike.%${search}%,fabricName.ilike.%${search}%`;
    countQ = countQ.or(f);
    dataQ = dataQ.or(f);
  }

  // Cursor-based: skip offset when cursor provided
  if (cursor) {
    dataQ = dataQ.lt("createdAt", cursor);
  } else {
    const skip = (page - 1) * pageSize;
    dataQ = dataQ.range(skip, skip + pageSize - 1);
  }

  const [{ count: total }, { data: rawData }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).limit(pageSize),
  ]);

  const data = (rawData ?? []).map((o: any) => ({
    ...o,
    statusHistory: (o.statusHistory ?? []).sort(
      (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    ),
  }));

  const lastItem = data[data.length - 1] as any;
  const nextCursor = data.length === pageSize ? lastItem?.createdAt ?? null : null;

  return {
    data: data as OrderWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
    nextCursor,
  };
}

export async function getOrderById(id: string): Promise<OrderWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Order")
    .select(ORDER_SELECT)
    .eq("id", id)
    .eq("isActive", true)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    statusHistory: (data.statusHistory ?? []).sort(
      (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    ),
  } as OrderWithRelations;
}

export async function createOrder(data: unknown): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const orderId = randomUUID();
    const historyId = randomUUID();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const items = parsed.data.items;
    const derivedGarmentType =
      items.length === 1
        ? items[0].garmentType
        : `${items[0].garmentType} +${items.length - 1} more`;

    const { error: orderError } = await supabase.from("Order").insert({
      id: orderId,
      orderNumber,
      customerId: parsed.data.customerId,
      garmentType: derivedGarmentType,
      fabricName: parsed.data.fabricName ?? null,
      fabricColor: parsed.data.fabricColor ?? null,
      fabricQuantity: parsed.data.fabricQuantity ?? null,
      deliveryDate: new Date(parsed.data.deliveryDate).toISOString(),
      trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate).toISOString() : null,
      totalAmount: parsed.data.totalAmount,
      advanceAmount: parsed.data.advanceAmount,
      priority: parsed.data.priority,
      designNotes: parsed.data.designNotes ?? null,
      notes: parsed.data.notes ?? null,
      assignedToId: parsed.data.assignedToId || null,
      status: "MEASUREMENT",
      branch: (session.user as any).branch ?? "Main",
      createdAt: now,
      updatedAt: now,
    });

    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("OrderItem").insert(
      items.map((item, idx) => ({
        id: randomUUID(),
        orderId,
        garmentType: item.garmentType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        assignedToId: item.assignedToId || null,
        notes: item.notes || null,
        sortOrder: item.sortOrder ?? idx,
        createdAt: now,
        updatedAt: now,
      }))
    );
    if (itemsError) throw itemsError;

    await supabase.from("OrderHistory").insert({
      id: historyId,
      orderId,
      status: "MEASUREMENT",
      notes: "Order created",
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: customer } = await supabase
      .from("Customer")
      .select("name")
      .eq("id", parsed.data.customerId)
      .maybeSingle();

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      orderId,
      action: "CREATE",
      entity: "Order",
      entityId: orderId,
      description: `Order "${orderNumber}" was created for ${customer?.name ?? "customer"}`,
    });

    const { data: order } = await supabase
      .from("Order")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .maybeSingle();

    revalidatePath("/orders");
    return {
      success: true,
      data: order as OrderWithRelations,
      message: `Order ${orderNumber} created successfully`,
    };
  } catch (error) {
    Sentry.captureException(error); console.error("Create order error:", error);
    return { success: false, error: "Failed to create order" };
  }
}

export async function updateOrder(id: string, data: unknown): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const items = parsed.data.items;
    const derivedGarmentType =
      items.length === 1
        ? items[0].garmentType
        : `${items[0].garmentType} +${items.length - 1} more`;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("Order")
      .update({
        customerId: parsed.data.customerId,
        garmentType: derivedGarmentType,
        fabricName: parsed.data.fabricName ?? null,
        fabricColor: parsed.data.fabricColor ?? null,
        fabricQuantity: parsed.data.fabricQuantity ?? null,
        deliveryDate: new Date(parsed.data.deliveryDate).toISOString(),
        trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate).toISOString() : null,
        totalAmount: parsed.data.totalAmount,
        advanceAmount: parsed.data.advanceAmount,
        priority: parsed.data.priority,
        designNotes: parsed.data.designNotes ?? null,
        notes: parsed.data.notes ?? null,
        assignedToId: parsed.data.assignedToId || null,
        updatedAt: now,
      })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("OrderItem").delete().eq("orderId", id);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("OrderItem").insert(
        items.map((item, idx) => ({
          id: randomUUID(),
          orderId: id,
          garmentType: item.garmentType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          assignedToId: item.assignedToId || null,
          notes: item.notes || null,
          sortOrder: item.sortOrder ?? idx,
          createdAt: now,
          updatedAt: now,
        }))
      );
      if (itemsError) throw itemsError;
    }

    const { data: order } = await supabase.from("Order").select(ORDER_SELECT).eq("id", id).maybeSingle();

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      orderId: id,
      action: "UPDATE",
      entity: "Order",
      entityId: id,
      description: `Order "${order?.orderNumber}" was updated`,
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    return { success: true, data: order as OrderWithRelations, message: "Order updated successfully" };
  } catch (error) {
    Sentry.captureException(error); console.error("Update order error:", error);
    return { success: false, error: "Failed to update order" };
  }
}

export async function updateOrderStatus(
  id: string,
  status: string,
  notes?: string,
  skipRevalidate?: boolean
): Promise<ApiResponse<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = orderStatusUpdateSchema.safeParse({ status, notes });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid status" };
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("Order")
      .update({ status: parsed.data.status, updatedAt: now })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("OrderHistory").insert({
      id: randomUUID(),
      orderId: id,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: order } = await supabase.from("Order").select(ORDER_SELECT).eq("id", id).maybeSingle();

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: (order as any)?.customerId,
      orderId: id,
      action: "STATUS_UPDATE",
      entity: "Order",
      entityId: id,
      description: `Order "${order?.orderNumber}" status changed to ${parsed.data.status}`,
      metadata: { status: parsed.data.status, notes: parsed.data.notes },
    });

    const customer = (order as any)?.customer;
    if (customer?.email) {
      sendOrderStatusUpdate({
        to: customer.email,
        customerName: customer.name,
        orderNumber: order?.orderNumber ?? "",
        status: parsed.data.status,
        garmentType: (order as any)?.garmentType ?? "",
      }).catch(() => {});
    }

    if (!skipRevalidate) {
      revalidatePath("/orders");
      revalidatePath(`/orders/${id}`);
    }
    return {
      success: true,
      data: { ...order, statusHistory: (order?.statusHistory ?? []).sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()) } as OrderWithRelations,
      message: `Order status updated to ${parsed.data.status}`,
    };
  } catch (error) {
    Sentry.captureException(error); console.error("Update order status error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export async function deleteOrder(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    const { data: order } = await supabase
      .from("Order")
      .select("orderNumber, customerId")
      .eq("id", id)
      .maybeSingle();

    await supabase.from("Order").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: order?.customerId,
      orderId: id,
      action: "DELETE",
      entity: "Order",
      entityId: id,
      description: `Order "${order?.orderNumber}" was deleted`,
    });

    revalidatePath("/orders");
    return { success: true, message: "Order deleted successfully" };
  } catch (error) {
    Sentry.captureException(error); console.error("Delete order error:", error);
    return { success: false, error: "Failed to delete order" };
  }
}

export async function updateOrderDesign(id: string, specText: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const trimmed = specText?.trim() ?? "";
  if (trimmed.length > 5000) throw new Error("Design notes exceed maximum length of 5000 characters");

  const { error } = await supabase
    .from("Order")
    .update({ designNotes: trimmed, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    Sentry.captureException(error);
    throw new Error("Failed to update order design");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
}

export async function getOrdersForKanban(branch?: string): Promise<OrderWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const db = await getDbClient(session.user.role, (session.user as any).branch ?? "Main");
  const branchFilter = getBranchFilter(session.user as any, branch);
  let q = db
    .from("Order")
    .select(ORDER_SELECT)
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")');
  if (branchFilter) q = q.eq("branch", branchFilter);
  const { data } = await q
    .order("deliveryDate", { ascending: true })
    .limit(200);

  return (data ?? []).map((o: any) => ({
    ...o,
    statusHistory: (o.statusHistory ?? []).sort(
      (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    ),
  })) as OrderWithRelations[];
}
