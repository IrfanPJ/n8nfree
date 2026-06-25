"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter } from "@/lib/branch-context";
import { orderSchema, orderStatusUpdateSchema } from "@/validators/order";
import { upsertFabricValues } from "@/actions/fabric-history";
import { generateOrderNumber } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { sendOrderStatusUpdate } from "@/lib/email";
import type { ApiResponse, OrderWithRelations, PaginatedResult, OrderStatus } from "@/types";

const ORDER_SELECT = `
  *,
  customer:Customer!customerId(*),
  assignedTo:User!assignedToId(*),
  masterTailor:TailorMaster!masterTailorId(*),
  salesperson:User!salespersonId(id, name, role),
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
  cursor?: string; // createdAt ISO string of last item for cursor-based pagination
}): Promise<PaginatedResult<OrderWithRelations>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const { page = 1, pageSize = 20, search, status, priority, cursor } = params;
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let countQ = db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = db.from("Order").select(ORDER_SELECT).eq("isActive", true);

  if (branchFilter) { countQ = countQ.eq("branchId", branchFilter); dataQ = dataQ.eq("branchId", branchFilter); }
  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (priority) { countQ = countQ.eq("priority", priority); dataQ = dataQ.eq("priority", priority); }
  if (search) {
    const safe = search.replace(/[%_,().]/g, "\\$&");
    const { data: matchedCustomers } = await db
      .from("Customer")
      .select("id")
      .ilike("name", `%${safe}%`);
    const customerIds = (matchedCustomers ?? []).map((c: any) => c.id);
    let f = `orderNumber.ilike.%${safe}%,customOrderNumber.ilike.%${safe}%,garmentType.ilike.%${safe}%,fabricName.ilike.%${safe}%`;
    if (customerIds.length > 0) f += `,customerId.in.(${customerIds.join(",")})`;
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

  const [{ count: total, error: countError }, { data: rawData, error: dataError }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).limit(pageSize),
  ]);

  // TEMP DIAGNOSTIC: surface scoped-client/RLS errors that were previously
  // silently swallowed by `data ?? []` fallbacks. Remove once branch
  // isolation is confirmed working for non-SUPER_ADMIN roles.
  if (countError || dataError) {
    console.error(
      `getOrders scoped-client error | role=${session.user.role} branches=${JSON.stringify(session.user.branches)} ` +
      `countError=${JSON.stringify(countError, Object.getOwnPropertyNames(countError ?? {}))} ` +
      `dataError=${JSON.stringify(dataError, Object.getOwnPropertyNames(dataError ?? {}))}`
    );
  }

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
  const db = await getScopedClient(session);

  const { data } = await db
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
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());

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

    const { error: orderError } = await db.from("Order").insert({
      id: orderId,
      orderNumber,
      customOrderNumber: parsed.data.customOrderNumber || null,
      customerId: parsed.data.customerId,
      garmentType: derivedGarmentType,
      fabricName: parsed.data.fabricName ?? null,
      fabricColor: parsed.data.fabricColor ?? null,
      fabricQuantity: parsed.data.fabricQuantity ?? null,
      deliveryDate: new Date(parsed.data.deliveryDate).toISOString(),
      trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate).toISOString() : null,
      trialRequired: parsed.data.trialRequired ?? false,
      totalAmount: parsed.data.totalAmount,
      advanceAmount: parsed.data.advanceAmount,
      priority: parsed.data.priority,
      designNotes: parsed.data.designNotes ?? null,
      notes: parsed.data.notes ?? null,
      assignedToId: parsed.data.assignedToId || null,
      masterTailorId: parsed.data.masterTailorId || null,
      salespersonId: parsed.data.salespersonId || null,
      stylingName: parsed.data.stylingName ?? null,
      stylingNotes: parsed.data.stylingNotes ?? null,
      stylingImageUrls: parsed.data.stylingImageUrls ?? [],
      purchaseNotes: parsed.data.purchaseNotes ?? null,
      specialNotes: parsed.data.specialNotes ?? null,
      branchId,
      status: "MEASUREMENT",
      createdAt: now,
      updatedAt: now,
    });

    if (orderError) throw orderError;

    const { error: itemsError } = await db.from("OrderItem").insert(
      items.map((item, idx) => ({
        id: randomUUID(),
        orderId,
        garmentType: item.garmentType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        assignedToId: item.assignedToId || null,
        notes: item.notes || null,
        sortOrder: item.sortOrder ?? idx,
        fabricCode:        (item as any).fabricCode || null,
        fabricComposition: (item as any).fabricComposition || null,
        fabricColor:       (item as any).fabricColor || null,
        fabricImageUrl:    (item as any).fabricImageUrl || null,
        createdAt: now,
        updatedAt: now,
      }))
    );
    if (itemsError) throw itemsError;

    // Save new fabric values to global history
    const fabricEntries = items.flatMap((item: any) => [
      { type: "code" as const,        value: item.fabricCode },
      { type: "composition" as const, value: item.fabricComposition },
      { type: "color" as const,       value: item.fabricColor },
    ]);
    upsertFabricValues(fabricEntries).catch(() => {});

    // Sync customOrderNumber to linked invoice's internalRef
    if (parsed.data.customOrderNumber) {
      db
        .from("Invoice")
        .update({ internalRef: parsed.data.customOrderNumber })
        .eq("orderId", orderId)
        .then(() => {});
    }

    // Create advance payment record if amount > 0 and method provided
    if (parsed.data.advanceAmount > 0 && parsed.data.advancePaymentMethod) {
      await db.from("Payment").insert({
        id: randomUUID(),
        orderId,
        amount: parsed.data.advanceAmount,
        method: parsed.data.advancePaymentMethod,
        methodNote: parsed.data.advancePaymentReference ?? null,
        notes: "Advance payment on order creation",
        paidAt: now,
        createdAt: now,
      });
    }

    // Auto-create purchase records for items with fabric codes
    autoCreatePurchasesForOrder(db, orderId, branchId, items, parsed.data.purchaseNotes ?? null).catch(() => {});

    await db.from("OrderHistory").insert({
      id: historyId,
      orderId,
      status: "MEASUREMENT",
      notes: "Order created",
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: customer } = await db
      .from("Customer")
      .select("name")
      .eq("id", parsed.data.customerId)
      .maybeSingle();

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      orderId,
      branchId,
      action: "CREATE",
      entity: "Order",
      entityId: orderId,
      description: `Order "${orderNumber}" was created for ${customer?.name ?? "customer"}`,
    });

    const { data: order } = await db
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
  const db = await getScopedClient(session);

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

    const { error } = await db
      .from("Order")
      .update({
        customOrderNumber: parsed.data.customOrderNumber || null,
        customerId: parsed.data.customerId,
        garmentType: derivedGarmentType,
        fabricName: parsed.data.fabricName ?? null,
        fabricColor: parsed.data.fabricColor ?? null,
        fabricQuantity: parsed.data.fabricQuantity ?? null,
        deliveryDate: new Date(parsed.data.deliveryDate).toISOString(),
        trialDate: parsed.data.trialDate ? new Date(parsed.data.trialDate).toISOString() : null,
        trialRequired: parsed.data.trialRequired ?? false,
        totalAmount: parsed.data.totalAmount,
        advanceAmount: parsed.data.advanceAmount,
        priority: parsed.data.priority,
        designNotes: parsed.data.designNotes ?? null,
        notes: parsed.data.notes ?? null,
        assignedToId: parsed.data.assignedToId || null,
        masterTailorId: parsed.data.masterTailorId || null,
        salespersonId: parsed.data.salespersonId || null,
        stylingName: parsed.data.stylingName ?? null,
        stylingNotes: parsed.data.stylingNotes ?? null,
        stylingImageUrls: parsed.data.stylingImageUrls ?? [],
        purchaseNotes: parsed.data.purchaseNotes ?? null,
        specialNotes: parsed.data.specialNotes ?? null,
        updatedAt: now,
      })
      .eq("id", id);

    if (error) throw error;

    // Insert new items first, then delete old ones — a failed insert never leaves the order itemless
    const newItemIds: string[] = [];
    if (items.length > 0) {
      const rows = items.map((item, idx) => {
        const rowId = randomUUID();
        newItemIds.push(rowId);
        return {
          id: rowId,
          orderId: id,
          garmentType: item.garmentType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          assignedToId: item.assignedToId || null,
          notes: item.notes || null,
          sortOrder: item.sortOrder ?? idx,
          fabricCode:        (item as any).fabricCode || null,
          fabricComposition: (item as any).fabricComposition || null,
          fabricColor:       (item as any).fabricColor || null,
          fabricImageUrl:    (item as any).fabricImageUrl || null,
          createdAt: now,
          updatedAt: now,
        };
      });
      const { error: itemsError } = await db.from("OrderItem").insert(rows);
      if (itemsError) throw itemsError;
      // Only delete old rows after new ones are confirmed saved
      await db.from("OrderItem").delete().eq("orderId", id).not("id", "in", `(${newItemIds.map((x) => `"${x}"`).join(",")})`);

      // Save new fabric values to global history
      const fabricEntries = parsed.data.items.flatMap((item: any) => [
        { type: "code" as const,        value: item.fabricCode },
        { type: "composition" as const, value: item.fabricComposition },
        { type: "color" as const,       value: item.fabricColor },
      ]);
      upsertFabricValues(fabricEntries).catch(() => {});

      // Sync customOrderNumber → linked invoice internalRef
      if (parsed.data.customOrderNumber) {
        db
          .from("Invoice")
          .update({ internalRef: parsed.data.customOrderNumber })
          .eq("orderId", id)
          .then(() => {});
      }
    } else {
      await db.from("OrderItem").delete().eq("orderId", id);
    }

    const { data: order } = await db.from("Order").select(ORDER_SELECT).eq("id", id).maybeSingle();

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      orderId: id,
      branchId: (order as any)?.branchId,
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
  const db = await getScopedClient(session);

  const parsed = orderStatusUpdateSchema.safeParse({ status, notes });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid status" };
  }

  try {
    const now = new Date().toISOString();

    const { error } = await db
      .from("Order")
      .update({ status: parsed.data.status, updatedAt: now })
      .eq("id", id);

    if (error) throw error;

    // Sync linked purchases within the fabric window
    const purchaseStatusMap: Record<string, string> = {
      MEASUREMENT:      "PENDING_PURCHASE",
      FABRIC_ORDERING:  "FABRIC_ORDERED",
      FABRIC_COLLECTED: "FABRIC_COLLECTED",
    };
    const syncedPurchaseStatus = purchaseStatusMap[parsed.data.status];
    if (syncedPurchaseStatus) {
      await db
        .from("Purchase")
        .update({ status: syncedPurchaseStatus, updatedAt: now })
        .eq("orderId", id);
    }

    await db.from("OrderHistory").insert({
      id: randomUUID(),
      orderId: id,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      changedBy: session.user.id,
      changedAt: now,
    });

    const { data: order } = await db.from("Order").select(ORDER_SELECT).eq("id", id).maybeSingle();

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: (order as any)?.customerId,
      orderId: id,
      branchId: (order as any)?.branchId,
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
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }
  const db = await getScopedClient(session);

  try {
    const { data: order } = await db
      .from("Order")
      .select("orderNumber, customerId, branchId")
      .eq("id", id)
      .maybeSingle();

    await db.from("Order").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: order?.customerId,
      orderId: id,
      branchId: (order as any)?.branchId,
      action: "DELETE",
      entity: "Order",
      entityId: id,
      description: `Order "${order?.orderNumber}" was deleted`,
    });

    revalidatePath("/orders");
    if (order?.customerId) revalidatePath(`/customers/${order.customerId}`);
    return { success: true, message: "Order deleted successfully" };
  } catch (error) {
    Sentry.captureException(error); console.error("Delete order error:", error);
    return { success: false, error: "Failed to delete order" };
  }
}

export async function updateOrderDesign(id: string, specText: string, design?: unknown): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowedDesignRoles = ["SUPER_ADMIN","ADMIN","MANAGER","PRODUCTION_IN_CHARGE","MASTER","TAILOR"];
  if (!allowedDesignRoles.includes(session.user.role)) throw new Error("Insufficient permissions");
  const db = await getScopedClient(session);

  // Store full design JSON alongside spec text so the designer can reload it
  const payload = design
    ? JSON.stringify({ spec: specText.trim(), design })
    : specText.trim();

  if (payload.length > 20000) throw new Error("Design data exceeds maximum length");

  const { error } = await db
    .from("Order")
    .update({ designNotes: payload, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    Sentry.captureException(error);
    throw new Error("Failed to update order design");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
}


async function autoCreatePurchasesForOrder(
  db: SupabaseClient,
  orderId: string,
  branchId: string,
  items: Array<any>,
  purchaseNotes: string | null
): Promise<void> {
  const fabricItems = items.filter((item) => item.fabricCode);
  if (fabricItems.length === 0) return;

  const now = new Date().toISOString();
  const rows = fabricItems.map((item) => ({
    id: randomUUID(),
    orderId,
    branchId,
    itemName: item.fabricCode,
    category: "FABRIC",
    fabricCode: item.fabricCode || null,
    fabricColor: item.fabricColor || null,
    quantity: item.quantity ?? 1,
    unit: "meters",
    unitPrice: 0,
    totalAmount: 0,
    paidAmount: 0,
    status: "PENDING_PURCHASE",
    purchaseNotes: purchaseNotes || null,
    purchaseDate: now,
    createdAt: now,
    updatedAt: now,
  }));

  await db.from("Purchase").insert(rows);
  revalidatePath("/purchases");
}

export async function getOrdersForKanban(): Promise<OrderWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  let q = db
    .from("Order")
    .select(ORDER_SELECT)
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")');

  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());
  if (branchFilter) q = q.eq("branchId", branchFilter);

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

export type DateConflictResult = {
  count: number;
  orders: Array<{ orderNumber: string; customOrderNumber: string | null; customerName: string }>;
};

export async function checkDateConflicts(
  date: string,          // ISO date string "YYYY-MM-DD"
  type: "delivery" | "trial",
  excludeOrderId?: string
): Promise<DateConflictResult> {
  const session = await auth();
  if (!session?.user) return { count: 0, orders: [] };
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const col = type === "delivery" ? "deliveryDate" : "trialDate";

  let q = db
    .from("Order")
    .select("orderNumber, customOrderNumber, customer:Customer!customerId(name)")
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .gte(col, `${date}T00:00:00`)
    .lte(col, `${date}T23:59:59`);

  if (branchId) q = q.eq("branchId", branchId);
  if (excludeOrderId) q = q.neq("id", excludeOrderId);

  const { data } = await q.limit(10);

  return {
    count: data?.length ?? 0,
    orders: (data ?? []).map((o: any) => ({
      orderNumber:       o.orderNumber,
      customOrderNumber: o.customOrderNumber ?? null,
      customerName:      o.customer?.name ?? "Unknown",
    })),
  };
}
