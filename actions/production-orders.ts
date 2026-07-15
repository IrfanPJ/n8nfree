"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  daysLate,
  daysUntil,
  deliveryUrgency,
  piecePayForOrder,
  isActiveStatus,
  isCompletedStatus,
  consumesTailorHours,
  getWeekdayName,
  toIsoDateLocal,
} from "@/lib/production-calc";
import { productionOrderSchema } from "@/validators/production";
import { getProductionTailors, getTailorWorkloads } from "@/actions/production-tailors";
import type { ApiResponse, PaginatedResult } from "@/types";
import type { ProductionOrderWithRelations, ProductionOverviewStats } from "@/types/production";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const ORDER_SELECT = `
  *,
  tailor:ProductionTailor!tailorId(id, name, jobTitles),
  priceListItem:ProductionPriceListItem!priceListItemId(id, item, unitPrice, estimatedHoursPerPiece)
`;

export async function getProductionOrders(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  store?: string;
  tailorId?: string;
  statusIn?: string[];
  sortBy?: "receivedDate" | "deliveryDate";
  sortDir?: "asc" | "desc";
}): Promise<PaginatedResult<ProductionOrderWithRelations>> {
  await requireSession();
  const {
    page = 1, pageSize = 25, search, status, store, tailorId, statusIn,
    sortBy = "receivedDate", sortDir = "desc",
  } = params;

  let countQ = supabase.from("ProductionOrder").select("*", { count: "exact", head: true }).eq("isActive", true);
  let dataQ = supabase.from("ProductionOrder").select(ORDER_SELECT).eq("isActive", true);

  if (status) { countQ = countQ.eq("status", status); dataQ = dataQ.eq("status", status); }
  if (statusIn?.length) { countQ = countQ.in("status", statusIn); dataQ = dataQ.in("status", statusIn); }
  if (store) { countQ = countQ.eq("store", store); dataQ = dataQ.eq("store", store); }
  if (tailorId) { countQ = countQ.eq("tailorId", tailorId); dataQ = dataQ.eq("tailorId", tailorId); }
  if (search) {
    const safe = search.replace(/[%_,().]/g, "\\$&");
    const f = `invoiceNo.ilike.%${safe}%,itemRaw.ilike.%${safe}%,store.ilike.%${safe}%,remarks.ilike.%${safe}%`;
    countQ = countQ.or(f);
    dataQ = dataQ.or(f);
  }

  const skip = (page - 1) * pageSize;
  const [{ count: total }, { data }] = await Promise.all([
    countQ,
    dataQ.order(sortBy, { ascending: sortDir === "asc" }).range(skip, skip + pageSize - 1),
  ]);

  return {
    data: (data ?? []) as ProductionOrderWithRelations[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

/** Full (unpaginated) order list for a scope — backs the Overview page's KPIs, Items Assigned, and Piece Rate Earnings, which all need both active and completed orders from the same dataset. */
export async function getProductionOverviewOrders(tailorId?: string): Promise<ProductionOrderWithRelations[]> {
  await requireSession();
  let q = supabase.from("ProductionOrder").select(ORDER_SELECT).eq("isActive", true);
  if (tailorId) q = q.eq("tailorId", tailorId);
  const { data } = await q.order("receivedDate", { ascending: false }).limit(1000);
  return (data ?? []) as ProductionOrderWithRelations[];
}

export async function getProductionOrderById(id: string): Promise<ProductionOrderWithRelations | null> {
  await requireSession();
  const { data } = await supabase.from("ProductionOrder").select(ORDER_SELECT).eq("id", id).maybeSingle();
  return (data as ProductionOrderWithRelations) ?? null;
}

export async function createProductionOrder(data: unknown): Promise<ApiResponse<ProductionOrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionOrderSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const { error } = await supabase.from("ProductionOrder").insert({
      id,
      receivedDate: parsed.data.receivedDate,
      store: parsed.data.store,
      invoiceNo: parsed.data.invoiceNo,
      notes: parsed.data.notes || null,
      itemRaw: parsed.data.itemRaw,
      priceListItemId: parsed.data.priceListItemId ?? null,
      qty: parsed.data.qty,
      tailorId: parsed.data.tailorId ?? null,
      deliveryDate: parsed.data.deliveryDate || null,
      dispatchTime: parsed.data.dispatchTime || null,
      scheduledDispatchDate: parsed.data.scheduledDispatchDate || null,
      possibleTime: parsed.data.possibleTime || null,
      status: parsed.data.status,
      remarks: parsed.data.remarks || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    if (error) throw error;

    revalidatePath("/production", "layout");
    const order = await getProductionOrderById(id);
    return { success: true, data: order ?? undefined, message: "Order created" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to create order" };
  }
}

export async function updateProductionOrder(id: string, data: unknown): Promise<ApiResponse<ProductionOrderWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionOrderSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const { error } = await supabase.from("ProductionOrder").update({
      receivedDate: parsed.data.receivedDate,
      store: parsed.data.store,
      invoiceNo: parsed.data.invoiceNo,
      notes: parsed.data.notes || null,
      itemRaw: parsed.data.itemRaw,
      priceListItemId: parsed.data.priceListItemId ?? null,
      qty: parsed.data.qty,
      tailorId: parsed.data.tailorId ?? null,
      deliveryDate: parsed.data.deliveryDate || null,
      dispatchTime: parsed.data.dispatchTime || null,
      scheduledDispatchDate: parsed.data.scheduledDispatchDate || null,
      possibleTime: parsed.data.possibleTime || null,
      status: parsed.data.status,
      remarks: parsed.data.remarks || null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;

    revalidatePath("/production", "layout");
    const order = await getProductionOrderById(id);
    return { success: true, data: order ?? undefined, message: "Order updated" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update order" };
  }
}

export async function updateProductionOrderStatus(id: string, status: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { error } = await supabase
      .from("ProductionOrder")
      .update({ status, updatedAt: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/production", "layout");
    return { success: true, message: "Status updated" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteProductionOrder(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    await supabase.from("ProductionOrder").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
    revalidatePath("/production", "layout");
    return { success: true, message: "Order deleted" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to delete order" };
  }
}

type CalcOrder = {
  id: string; qty: number; status: string; deliveryDate: string | null; tailorId: string | null;
};

async function getAllActiveOrdersRaw(): Promise<CalcOrder[]> {
  const { data } = await supabase
    .from("ProductionOrder")
    .select("id, qty, status, deliveryDate, tailorId")
    .eq("isActive", true);
  return (data ?? []) as CalcOrder[];
}

/**
 * Overview KPIs. When `tailorId` is given (the per-tailor detail view),
 * every count is scoped to that tailor's orders only.
 */
export async function getProductionOverviewStats(tailorId?: string): Promise<ProductionOverviewStats> {
  await requireSession();
  const all = await getAllActiveOrdersRaw();
  const orders = tailorId ? all.filter((o) => o.tailorId === tailorId) : all;

  const activeOrders = orders.filter((o) => isActiveStatus(o.status));
  const completed = orders.filter((o) => isCompletedStatus(o.status));
  const delayed = orders.filter((o) => daysLate(o.deliveryDate, o.status) > 0);
  const notCompleted = orders.filter((o) => !isCompletedStatus(o.status));

  let daysToFinish = 0;
  if (tailorId) {
    const workloads = await getTailorWorkloads();
    daysToFinish = workloads.find((w) => w.tailor.id === tailorId)?.workDays ?? 0;
  } else {
    // The shop finishes its current backlog when its busiest tailor does —
    // tailors work in parallel, so this is a max, not a sum, across tailors.
    const workloads = await getTailorWorkloads();
    daysToFinish = workloads.reduce((max, w) => Math.max(max, w.workDays), 0);
  }

  return {
    activeOrders: activeOrders.length,
    pcsInHand: activeOrders.reduce((s, o) => s + o.qty, 0),
    daysToFinish,
    totalOrders: orders.length,
    pcsCompleted: completed.reduce((s, o) => s + o.qty, 0),
    delayed: delayed.length,
    trialReadyPcs: orders.filter((o) => o.status === "TRIAL READY").reduce((s, o) => s + o.qty, 0),
    returnItemsPcs: orders.filter((o) => o.status === "RETURN ITEMS").reduce((s, o) => s + o.qty, 0),
    cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
    remaining: notCompleted.length,
  };
}

export type CalendarDay = {
  date: string;
  orders: Array<{
    id: string; invoiceNo: string; itemRaw: string; qty: number; store: string;
    tailorName: string | null; status: string; isWeeklyOffConflict: boolean;
  }>;
};

export type CalendarChip = "critical" | "urgent" | "nearing";

export type CalendarAttentionOrder = {
  id: string; invoiceNo: string; store: string; itemRaw: string; qty: number;
  tailorName: string | null; receivedDate: string; deliveryDate: string; daysLate: number;
  status: string; chip: CalendarChip;
};

export type CalendarData = {
  days: CalendarDay[];
  critical: number;
  urgent: number;
  nearing: number;
  // Orders across all three urgency buckets (overdue, today/tomorrow,
  // 2-3 days out) — the page's summary chips filter this client-side by
  // `chip` rather than requiring three separate round-trips.
  attentionOrders: CalendarAttentionOrder[];
};

export async function getProductionCalendarData(): Promise<CalendarData> {
  await requireSession();
  const today = new Date();
  const [tailors, { data }] = await Promise.all([
    getProductionTailors(true),
    supabase
      .from("ProductionOrder")
      .select("id, invoiceNo, itemRaw, qty, store, status, receivedDate, deliveryDate, tailorId")
      .eq("isActive", true),
  ]);
  const tailorById = new Map(tailors.map((t) => [t.id, t]));
  const orders = (data ?? []) as Array<{
    id: string; invoiceNo: string; itemRaw: string; qty: number; store: string; status: string;
    receivedDate: string; deliveryDate: string | null; tailorId: string | null;
  }>;
  const active = orders.filter((o) => isActiveStatus(o.status));

  const days: CalendarDay[] = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const iso = toIsoDateLocal(date);
    const weekday = getWeekdayName(date);
    const dayOrders = active
      .filter((o) => o.deliveryDate === iso)
      .map((o) => {
        const tailor = o.tailorId ? tailorById.get(o.tailorId) : null;
        return {
          id: o.id,
          invoiceNo: o.invoiceNo,
          itemRaw: o.itemRaw,
          qty: o.qty,
          store: o.store,
          tailorName: tailor?.name ?? null,
          status: o.status,
          isWeeklyOffConflict: tailor?.weeklyOffDay === weekday,
        };
      });
    days.push({ date: iso, orders: dayOrders });
  }

  let critical = 0, urgent = 0, nearing = 0;
  const attentionOrders: CalendarAttentionOrder[] = [];
  for (const o of active) {
    const urgency = deliveryUrgency(o.deliveryDate, o.status, today);
    const chip: CalendarChip | null =
      urgency === "overdue" ? "critical" : urgency === "today" || urgency === "tomorrow" ? "urgent" : urgency === "nearing" ? "nearing" : null;
    if (!chip) continue;
    if (chip === "critical") critical++;
    else if (chip === "urgent") urgent++;
    else nearing++;

    attentionOrders.push({
      id: o.id, invoiceNo: o.invoiceNo, store: o.store, itemRaw: o.itemRaw, qty: o.qty,
      tailorName: o.tailorId ? tailorById.get(o.tailorId)?.name ?? null : null,
      receivedDate: o.receivedDate, deliveryDate: o.deliveryDate!, daysLate: daysLate(o.deliveryDate, o.status, today),
      status: o.status, chip,
    });
  }
  attentionOrders.sort((a, b) => b.daysLate - a.daysLate);

  return { days, critical, urgent, nearing, attentionOrders };
}

export type CapacitySlot = {
  tailorId: string; tailorName: string; capacityPcsPerDay: number | null; committedPcs: number;
  busyUntil: string; openWindow: "Fully booked" | "Open now"; availableCapacityLabel: string; suggestion: string;
};

export type ProductionRecommendation = {
  priority: number; orderId: string; invoiceNo: string; itemRaw: string; qty: number;
  receivedDate: string; deliveryDate: string | null; urgencyLabel: string; isDelayed: boolean;
  tailorId: string | null; tailorName: string | null;
};

export async function getProductionSuggestions(): Promise<{ capacity: CapacitySlot[]; recommendations: ProductionRecommendation[] }> {
  await requireSession();
  const [workloads, { data }] = await Promise.all([
    getTailorWorkloads(),
    supabase
      .from("ProductionOrder")
      .select("id, invoiceNo, itemRaw, qty, status, receivedDate, deliveryDate, tailorId")
      .eq("isActive", true),
  ]);
  const tailorNameById = new Map(workloads.map((w) => [w.tailor.id, w.tailor.name]));

  const capacity: CapacitySlot[] = workloads.map((w) => {
    if (w.isAvailableNow) {
      return {
        tailorId: w.tailor.id,
        tailorName: w.tailor.name,
        capacityPcsPerDay: w.tailor.capacityPcsPerDay,
        committedPcs: w.pcsInHand,
        busyUntil: w.nextAvailableDate,
        openWindow: "Open now",
        availableCapacityLabel: "Full capacity free",
        suggestion: "✅ Ready to take new orders immediately",
      };
    }
    return {
      tailorId: w.tailor.id,
      tailorName: w.tailor.name,
      capacityPcsPerDay: w.tailor.capacityPcsPerDay,
      committedPcs: w.pcsInHand,
      busyUntil: w.nextAvailableDate,
      openWindow: "Fully booked",
      availableCapacityLabel: "0 pcs",
      suggestion: `Next free slot: ${w.nextAvailableDate} (~${w.workDays}d)`,
    };
  });

  const orders = (data ?? []) as Array<{
    id: string; invoiceNo: string; itemRaw: string; qty: number; status: string; receivedDate: string;
    deliveryDate: string | null; tailorId: string | null;
  }>;
  const pending = orders.filter((o) => consumesTailorHours(o.status));
  const today = new Date();
  const delayed = pending
    .map((o) => ({ o, late: daysLate(o.deliveryDate, o.status, today) }))
    .filter((x) => x.late > 0)
    .sort((a, b) => b.late - a.late);
  const notYetDue = pending
    .filter((o) => daysLate(o.deliveryDate, o.status, today) === 0)
    .sort((a, b) => (a.deliveryDate ?? "9999").localeCompare(b.deliveryDate ?? "9999"));

  const recommendations: ProductionRecommendation[] = [
    ...delayed.map(({ o, late }) => ({
      priority: 0, orderId: o.id, invoiceNo: o.invoiceNo, itemRaw: o.itemRaw, qty: o.qty,
      receivedDate: o.receivedDate, deliveryDate: o.deliveryDate, urgencyLabel: `DELAYED ${late}d`, isDelayed: true,
      tailorId: o.tailorId, tailorName: o.tailorId ? tailorNameById.get(o.tailorId) ?? null : null,
    })),
    ...notYetDue.map((o) => ({
      priority: 0, orderId: o.id, invoiceNo: o.invoiceNo, itemRaw: o.itemRaw, qty: o.qty,
      receivedDate: o.receivedDate, deliveryDate: o.deliveryDate,
      urgencyLabel: o.deliveryDate ? `DUE IN ${Math.max(0, daysUntil(o.deliveryDate, today))}d` : "NO DUE DATE",
      isDelayed: false,
      tailorId: o.tailorId, tailorName: o.tailorId ? tailorNameById.get(o.tailorId) ?? null : null,
    })),
  ].map((r, i) => ({ ...r, priority: i + 1 }));

  return { capacity, recommendations };
}

export type PayReportFilters = {
  fromDate?: string;
  toDate?: string;
  tailorId?: string;
  store?: string;
  status?: string;
  itemType?: string;
};

export type PayReportRow = {
  sl: number; id: string; invoiceNo: string; store: string; itemRaw: string; notes: string | null;
  qty: number; tailorName: string | null; receivedDate: string; deliveryDate: string | null;
  status: string; ratePerPc: number; payValue: number;
};

export type PayReportSummary = {
  tailorId: string; tailorName: string; totalPay: number; orderCount: number; pcsCount: number;
  deltaVsSalary: number; monthlySalary: number; ctc: number;
};

export type PayReportResult = {
  rows: PayReportRow[];
  summaryByTailor: PayReportSummary[];
  totalOrders: number;
  totalPieces: number;
  totalPayValue: number;
};

/** Date range filters apply to Delivery Date — the milestone piece pay is tied to. */
export async function getProductionPayReport(filters: PayReportFilters): Promise<PayReportResult> {
  await requireSession();
  const { fromDate, toDate, tailorId, store, status, itemType } = filters;

  let q = supabase.from("ProductionOrder").select(`
    id, invoiceNo, store, itemRaw, notes, qty, receivedDate, deliveryDate, status,
    tailor:ProductionTailor!tailorId(id, name),
    priceListItem:ProductionPriceListItem!priceListItemId(item, unitPrice)
  `).eq("isActive", true);

  if (fromDate) q = q.gte("deliveryDate", fromDate);
  if (toDate) q = q.lte("deliveryDate", toDate);
  if (tailorId) q = q.eq("tailorId", tailorId);
  if (store) q = q.eq("store", store);
  if (status) q = q.eq("status", status);
  if (itemType) q = q.ilike("itemRaw", `%${itemType}%`);

  const { data } = await q.order("deliveryDate", { ascending: false });
  const raw = (data ?? []) as unknown as Array<{
    id: string; invoiceNo: string; store: string; itemRaw: string; notes: string | null; qty: number;
    receivedDate: string; deliveryDate: string | null; status: string;
    tailor: { id: string; name: string } | null;
    priceListItem: { item: string; unitPrice: number } | null;
  }>;

  const rows: PayReportRow[] = raw.map((o, idx) => {
    const rate = o.priceListItem?.unitPrice ?? 0;
    return {
      sl: idx + 1, id: o.id, invoiceNo: o.invoiceNo, store: o.store, itemRaw: o.itemRaw, notes: o.notes,
      qty: o.qty, tailorName: o.tailor?.name ?? null, receivedDate: o.receivedDate, deliveryDate: o.deliveryDate,
      status: o.status, ratePerPc: rate, payValue: piecePayForOrder(o.qty, rate, o.status),
    };
  });

  const tailors = await getProductionTailors(true);
  const tailorMap = new Map(tailors.map((t) => [t.id, t]));
  const byTailor = new Map<string, { totalPay: number; orderCount: number; pcsCount: number }>();
  for (const o of raw) {
    if (!o.tailor?.id) continue;
    const bucket = byTailor.get(o.tailor.id) ?? { totalPay: 0, orderCount: 0, pcsCount: 0 };
    bucket.totalPay += piecePayForOrder(o.qty, o.priceListItem?.unitPrice ?? 0, o.status);
    bucket.orderCount += 1;
    bucket.pcsCount += o.qty;
    byTailor.set(o.tailor.id, bucket);
  }

  const summaryByTailor: PayReportSummary[] = [...byTailor.entries()].map(([tId, bucket]) => {
    const tailor = tailorMap.get(tId);
    return {
      tailorId: tId,
      tailorName: tailor?.name ?? "Unknown",
      totalPay: bucket.totalPay,
      orderCount: bucket.orderCount,
      pcsCount: bucket.pcsCount,
      deltaVsSalary: bucket.totalPay - (tailor?.monthlySalary ?? 0),
      monthlySalary: tailor?.monthlySalary ?? 0,
      ctc: tailor?.totalCostToCompany ?? 0,
    };
  }).sort((a, b) => b.totalPay - a.totalPay);

  return {
    rows,
    summaryByTailor,
    totalOrders: rows.length,
    totalPieces: rows.reduce((s, r) => s + r.qty, 0),
    totalPayValue: rows.reduce((s, r) => s + r.payValue, 0),
  };
}

/** Powers the sidebar's "Tailors N" / "Calendar N" badge counts. Never throws — a bad count shouldn't break the whole dashboard shell. */
export async function getProductionBadgeCounts(): Promise<{ tailors: number; calendarUpcoming: number }> {
  try {
    const session = await auth();
    if (!session?.user) return { tailors: 0, calendarUpcoming: 0 };

    const today = new Date();
    const sixDaysOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
    const [{ count: tailors }, { count: calendarUpcoming }] = await Promise.all([
      supabase.from("ProductionTailor").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabase
        .from("ProductionOrder")
        .select("*", { count: "exact", head: true })
        .eq("isActive", true)
        .gte("deliveryDate", toIsoDateLocal(today))
        .lte("deliveryDate", toIsoDateLocal(sixDaysOut))
        .not("status", "in", '("DELIVERED","DISPATCHED","CANCELLED")'),
    ]);
    return { tailors: tailors ?? 0, calendarUpcoming: calendarUpcoming ?? 0 };
  } catch {
    return { tailors: 0, calendarUpcoming: 0 };
  }
}
