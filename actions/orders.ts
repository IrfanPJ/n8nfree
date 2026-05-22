"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { orderSchema, orderStatusUpdateSchema } from "@/validators/order";
import { generateOrderNumber } from "@/lib/utils";
import type { ApiResponse, OrderWithRelations, PaginatedResult, OrderStatus } from "@/types";

const ORDER_SELECT = `
  *,
  customer:Customer!customerId(*),
  assignedTo:User!assignedToId(*),
  invoice:Invoice!orderId(*),
  statusHistory:OrderHistory!orderId(*)
`;

export async function getOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
}): Promise<PaginatedResult<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 20, search, status, priority } = params;
  const skip = (page - 1) * pageSize;

  let countQ = supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = supabase.from("Order").select(ORDER_SELECT).eq("isActive", true);

  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (priority) { countQ = countQ.eq("priority", priority); dataQ = dataQ.eq("priority", priority); }
  if (search) {
    const f = `orderNumber.ilike.%${search}%,garmentType.ilike.%${search}%,fabricName.ilike.%${search}%`;
    countQ = countQ.or(f);
    dataQ = dataQ.or(f);
  }

  const [{ count: total }, { data: rawData }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

  const data = (rawData ?? []).map((o: any) => ({
    ...o,
    statusHistory: (o.statusHistory ?? []).sort(
      (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    ),
  }));

  return {
    data: data as OrderWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
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

    const { error: orderError } = await supabase.from("Order").insert({
      id: orderId,
      orderNumber,
      customerId: parsed.data.customerId,
      garmentType: parsed.data.garmentType,
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
      assignedToId: parsed.data.assignedToId ?? null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    if (orderError) throw orderError;

    await supabase.from("OrderHistory").insert({
      id: historyId,
      orderId,
      status: "PENDING",
      notes: "Order created",
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: customer } = await supabase
      .from("Customer")
      .select("name")
      .eq("id", parsed.data.customerId)
      .single();

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
      .single();

    revalidatePath("/orders");
    return {
      success: true,
      data: order as OrderWithRelations,
      message: `Order ${orderNumber} created successfully`,
    };
  } catch (error) {
    console.error("Create order error:", error);
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
    const { error } = await supabase
      .from("Order")
      .update({
        customerId: parsed.data.customerId,
        garmentType: parsed.data.garmentType,
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
        assignedToId: parsed.data.assignedToId ?? null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    const { data: order } = await supabase.from("Order").select(ORDER_SELECT).eq("id", id).single();

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
    console.error("Update order error:", error);
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

    const { data: order } = await supabase.from("Order").select(ORDER_SELECT).eq("id", id).single();

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
    console.error("Update order status error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

export async function deleteOrder(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { data: order } = await supabase
      .from("Order")
      .select("orderNumber, customerId")
      .eq("id", id)
      .single();

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
    console.error("Delete order error:", error);
    return { success: false, error: "Failed to delete order" };
  }
}

export async function updateOrderDesign(id: string, specText: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await supabase.from("Order").update({ designNotes: specText, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/orders");
}

export async function getOrdersForKanban(): Promise<OrderWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Order")
    .select(ORDER_SELECT)
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","CANCELLED")')
    .order("deliveryDate", { ascending: true });

  return (data ?? []).map((o: any) => ({
    ...o,
    statusHistory: (o.statusHistory ?? []).sort(
      (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    ),
  })) as OrderWithRelations[];
}
