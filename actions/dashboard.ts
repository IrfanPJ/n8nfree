"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveReadBranchFilter } from "@/lib/branch-context";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, RevenueData, OrderStatusData } from "@/types";

async function countWhere(db: SupabaseClient, table: string, filters: Record<string, unknown>, branchId?: string): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  if (branchId) q = q.eq("branchId", branchId);
  const { count } = await q;
  return count ?? 0;
}

async function countRange(
  db: SupabaseClient,
  table: string,
  base: Record<string, unknown>,
  rangeCol: string,
  start: Date,
  end: Date,
  branchId?: string,
): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(base)) q = q.eq(k, v);
  q = q.gte(rangeCol, start.toISOString()).lte(rangeCol, end.toISOString());
  if (branchId) q = q.eq("branchId", branchId);
  const { count } = await q;
  return count ?? 0;
}

async function sumRevenue(db: SupabaseClient, start: Date, end: Date, branchId?: string): Promise<number> {
  let q = db
    .from("Invoice")
    .select("paidAmount")
    .eq("isActive", true)
    .eq("status", "PAID")
    .gte("createdAt", start.toISOString())
    .lte("createdAt", end.toISOString());
  if (branchId) q = q.eq("branchId", branchId);
  const { data } = await q;
  return data?.reduce((s, r) => s + (r.paidAmount ?? 0), 0) ?? 0;
}

async function sumPOSRevenue(db: SupabaseClient, start: Date, end: Date, branchId?: string): Promise<number> {
  let q = db
    .from("POSSale")
    .select("total")
    .gte("createdAt", start.toISOString())
    .lte("createdAt", end.toISOString());
  if (branchId) q = q.eq("branchId", branchId);
  const { data } = await q;
  return data?.reduce((s, r) => s + (r.total ?? 0), 0) ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const now = new Date();
  const curStart = startOfMonth(now);
  const curEnd = endOfMonth(now);
  const lastStart = startOfMonth(subMonths(now, 1));
  const lastEnd = endOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let todayApptsQ = db.from("Appointment").select("*", { count: "exact", head: true }).eq("isActive", true).gte("startTime", todayStart.toISOString()).lte("startTime", todayEnd.toISOString());
  let upcomingDeliveriesQ = db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "READY_FOR_DELIVERY").gte("deliveryDate", now.toISOString()).lte("deliveryDate", weekOut.toISOString());
  let totalRevDataQ = db.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID");
  let posSalesTodayQ = db.from("POSSale").select("*", { count: "exact", head: true }).gte("createdAt", todayStart.toISOString()).lte("createdAt", todayEnd.toISOString());
  let totalPOSRevenueQ = db.from("POSSale").select("total");
  let activeLeadsQ = db.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST")');
  let closedWonLeadsQ = db.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).eq("stage", "CLOSED_WON");
  let pipelineLeadsQ = db.from("Lead").select("value").eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST")');
  let fabricsQ = db.from("Fabric").select("stockQty, reorderLevel").eq("isActive", true);
  let pendingFollowUpsQ = db.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "PENDING");
  let overdueFollowUpsQ = db.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "PENDING").lt("dueDate", now.toISOString());

  if (branchId) {
    todayApptsQ = todayApptsQ.eq("branchId", branchId);
    upcomingDeliveriesQ = upcomingDeliveriesQ.eq("branchId", branchId);
    totalRevDataQ = totalRevDataQ.eq("branchId", branchId);
    posSalesTodayQ = posSalesTodayQ.eq("branchId", branchId);
    totalPOSRevenueQ = totalPOSRevenueQ.eq("branchId", branchId);
    activeLeadsQ = activeLeadsQ.eq("branchId", branchId);
    closedWonLeadsQ = closedWonLeadsQ.eq("branchId", branchId);
    pipelineLeadsQ = pipelineLeadsQ.eq("branchId", branchId);
    fabricsQ = fabricsQ.eq("branchId", branchId);
    pendingFollowUpsQ = pendingFollowUpsQ.eq("branchId", branchId);
    overdueFollowUpsQ = overdueFollowUpsQ.eq("branchId", branchId);
  }

  const [
    totalOrders, pendingOrders, completedOrders,
    totalCustomers, curCustomers, lastCustomers,
    curRev, lastRev,
    curOrders, lastOrders,
    todayAppts, upcomingDeliveries, overdueInvoices,
    totalRevData,
    // POS
    posSalesTodayCount, posRevenueToday, totalPOSRevenue,
    // Leads
    activeLeadsData, closedWonLeadsData, pipelineLeadsData,
    // Fabrics
    fabricsData,
    // Follow-ups
    pendingFollowUpsCount, overdueFollowUpsCount,
  ] = await Promise.all([
    countWhere(db, "Order", { isActive: true }, branchId),
    db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")').then(r => r.count ?? 0),
    countWhere(db, "Order", { isActive: true, status: "DELIVERED" }, branchId),
    countWhere(db, "Customer", { isActive: true }, branchId),
    countRange(db, "Customer", { isActive: true }, "createdAt", curStart, curEnd, branchId),
    countRange(db, "Customer", { isActive: true }, "createdAt", lastStart, lastEnd, branchId),
    sumRevenue(db, curStart, curEnd, branchId),
    sumRevenue(db, lastStart, lastEnd, branchId),
    countRange(db, "Order", { isActive: true }, "createdAt", curStart, curEnd, branchId),
    countRange(db, "Order", { isActive: true }, "createdAt", lastStart, lastEnd, branchId),
    todayApptsQ.then(r => r.count ?? 0),
    upcomingDeliveriesQ.then(r => r.count ?? 0),
    countWhere(db, "Invoice", { isActive: true, status: "OVERDUE" }, branchId),
    totalRevDataQ.then(r => r.data?.reduce((s: number, i: any) => s + (i.paidAmount ?? 0), 0) ?? 0),
    // POS
    posSalesTodayQ.then(r => r.count ?? 0),
    sumPOSRevenue(db, todayStart, todayEnd, branchId),
    totalPOSRevenueQ.then(r => r.data?.reduce((s: number, i: any) => s + (i.total ?? 0), 0) ?? 0),
    // Leads
    activeLeadsQ.then(r => r.count ?? 0),
    closedWonLeadsQ.then(r => r.count ?? 0),
    pipelineLeadsQ.then(r => r.data?.reduce((s: number, i: any) => s + (i.value ?? 0), 0) ?? 0),
    // Fabrics
    fabricsQ,
    // Follow-ups
    pendingFollowUpsQ.then(r => r.count ?? 0),
    overdueFollowUpsQ.then(r => r.count ?? 0),
  ]);

  const revenueGrowth = lastRev === 0 ? 100 : ((curRev - lastRev) / lastRev) * 100;
  const orderGrowth = lastOrders === 0 ? 100 : ((curOrders - lastOrders) / lastOrders) * 100;
  const customerGrowth = lastCustomers === 0 ? 100 : ((curCustomers - lastCustomers) / lastCustomers) * 100;

  const fabrics = fabricsData.data ?? [];
  const lowStockFabrics = fabrics.filter((f: any) => f.stockQty <= f.reorderLevel).length;

  return {
    totalRevenue: totalRevData,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalCustomers,
    newCustomers: curCustomers,
    todayAppointments: todayAppts,
    upcomingDeliveries,
    overdueInvoices,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    orderGrowth: Math.round(orderGrowth * 10) / 10,
    customerGrowth: Math.round(customerGrowth * 10) / 10,
    posSalesToday: posSalesTodayCount,
    posRevenueToday,
    totalPOSRevenue,
    activeLeads: activeLeadsData,
    closedWonLeads: closedWonLeadsData,
    pipelineValue: pipelineLeadsData,
    lowStockFabrics,
    totalFabrics: fabrics.length,
    pendingFollowUps: pendingFollowUpsCount,
    overdueFollowUps: overdueFollowUpsCount,
  };
}

export async function getRevenueData(): Promise<RevenueData[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: date.toLocaleString("en-AE", { month: "short" }) };
  });

  return Promise.all(
    months.map(async ({ start, end, label }) => {
      const [rev, orderCount] = await Promise.all([
        sumRevenue(db, start, end, branchId),
        countRange(db, "Order", { isActive: true }, "createdAt", start, end, branchId),
      ]);
      return { month: label, revenue: rev, orders: orderCount };
    })
  );
}

export async function getOrderStatusData(): Promise<OrderStatusData[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const statuses = [
    "MEASUREMENT", "FABRIC_ORDERING", "FABRIC_COLLECTED", "CUTTING",
    "SEMI_STITCH", "TRIAL", "FINAL_STITCH", "READY_FOR_DELIVERY",
    "DELIVERED", "PENDING_ALTERATION", "READY_FINAL_DELIVERY", "ORDER_CLOSED",
  ] as const;
  const colors = [
    "#60a5fa", "#f97316", "#fbbf24", "#facc15",
    "#a78bfa", "#22d3ee", "#818cf8", "#4ade80",
    "#34d399", "#fb7185", "#2dd4bf", "#9ca3af",
  ];

  const counts = await Promise.all(
    statuses.map((s) => countWhere(db, "Order", { isActive: true, status: s }, branchId))
  );

  const labels: Record<string, string> = {
    MEASUREMENT: "Measurement", FABRIC_ORDERING: "Fabric Ordering", FABRIC_COLLECTED: "Fabric Collected",
    CUTTING: "Cutting", SEMI_STITCH: "Semi Stitch", TRIAL: "Trial",
    FINAL_STITCH: "Final Stitch", READY_FOR_DELIVERY: "Ready for Delivery",
    DELIVERED: "Delivered", PENDING_ALTERATION: "Pending Alteration",
    READY_FINAL_DELIVERY: "Ready Final Delivery", ORDER_CLOSED: "Order Closed",
  };
  return statuses.map((status, i) => ({
    status: labels[status] ?? status,
    count: counts[i],
    color: colors[i],
  }));
}

export async function getUrgentOrders() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let q = db
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, status, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .lte("deliveryDate", sevenDaysOut.toISOString());
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("deliveryDate", { ascending: true });

  return (data ?? []).map((o: any) => {
    const due = new Date(o.deliveryDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let urgency: "overdue" | "today" | "soon" = "soon";
    if (diffDays < 0) urgency = "overdue";
    else if (diffDays === 0) urgency = "today";
    return { ...o, daysUntilDelivery: diffDays, urgency };
  });
}

export async function getWorkshopCapacity() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const MAX_SLOTS = 20;
  let q = db
    .from("Order")
    .select("*", { count: "exact", head: true })
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")');
  if (branchId) q = q.eq("branchId", branchId);
  const { count } = await q;

  const current = count ?? 0;
  return { current, max: MAX_SLOTS, percentage: Math.round((current / MAX_SLOTS) * 100) };
}

export async function getNextDelivery() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let q = db
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, customer:Customer!customerId(name)")
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .gte("deliveryDate", new Date().toISOString());
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("deliveryDate", { ascending: true }).limit(1);

  return data?.[0] ?? null;
}

export async function getBookingHeatmap() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  let q = db
    .from("Appointment")
    .select("startTime")
    .eq("isActive", true)
    .gte("startTime", fourWeeksAgo.toISOString());
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q;

  const counts = [0, 0, 0, 0, 0, 0, 0];
  (data ?? []).forEach((apt: any) => {
    const day = new Date(apt.startTime).getDay();
    counts[day]++;
  });
  return counts;
}

export async function getTodayAppointments() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let q = db
    .from("Appointment")
    .select("id, title, type, startTime, endTime, status, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .gte("startTime", todayStart.toISOString())
    .lte("startTime", todayEnd.toISOString());
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("startTime", { ascending: true });

  return data ?? [];
}

export async function getReadyOrders() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let q = db
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .eq("status", "READY_FOR_DELIVERY");
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("deliveryDate", { ascending: true }).limit(10);

  return data ?? [];
}

// ── Role-specific dashboard data ─────────────────────────────────────────────

export async function getMyAssignedOrders(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  // Orders directly assigned to user
  const { data: directOrders } = await db
    .from("Order")
    .select("id, orderNumber, garmentType, status, deliveryDate, priority, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .eq("assignedToId", userId)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .order("deliveryDate", { ascending: true })
    .limit(20);

  // Orders with items assigned to this user
  const { data: itemOrders } = await db
    .from("OrderItem")
    .select("orderId, order:Order!orderId(id, orderNumber, garmentType, status, deliveryDate, priority, customer:Customer!customerId(name, phone))")
    .eq("assignedToId", userId)
    .limit(30);

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const o of (directOrders ?? [])) { seen.add(o.id); merged.push(o); }
  for (const item of (itemOrders ?? [])) {
    const o = (item as any).order;
    if (o && !seen.has(o.id) && !["DELIVERED", "ORDER_CLOSED"].includes(o.status)) {
      seen.add(o.id);
      merged.push(o);
    }
  }
  return merged.sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
}

export async function getMyFollowUps(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const now = new Date().toISOString();

  const [{ data: pending }, { count: overdueCount }] = await Promise.all([
    db.from("FollowUp")
      .select("id, title, dueDate, priority, status, customer:Customer!customerId(id, name, phone)")
      .eq("isActive", true)
      .eq("staffId", userId)
      .eq("status", "PENDING")
      .order("dueDate", { ascending: true })
      .limit(10),
    db.from("FollowUp")
      .select("*", { count: "exact", head: true })
      .eq("isActive", true)
      .eq("staffId", userId)
      .eq("status", "PENDING")
      .lt("dueDate", now),
  ]);

  return { pending: pending ?? [], overdueCount: overdueCount ?? 0 };
}

export async function getMyAppointmentsToday(staffId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data } = await db
    .from("Appointment")
    .select("id, title, type, status, startTime, endTime, location, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .eq("staffId", staffId)
    .gte("startTime", todayStart)
    .lte("startTime", todayEnd)
    .order("startTime", { ascending: true });

  return data ?? [];
}

export async function getSalesStats(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const [
    { count: activeLeads },
    { count: myOpenFollowUps },
    { count: apptToday },
    { count: closedThisMonth },
    { data: stageData },
  ] = await Promise.all([
    db.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST","IRRELEVANT")'),
    db.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true).eq("staffId", userId).eq("status", "PENDING"),
    db.from("Appointment").select("*", { count: "exact", head: true }).eq("isActive", true).eq("staffId", userId).gte("startTime", startOfDay(now).toISOString()).lte("startTime", endOfDay(now).toISOString()),
    db.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).eq("stage", "CLOSED_WON").gte("updatedAt", monthStart).lte("updatedAt", monthEnd),
    db.from("Lead").select("stage").eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST","IRRELEVANT")'),
  ]);

  const stageBreakdown: Record<string, number> = {};
  for (const row of stageData ?? []) {
    stageBreakdown[row.stage] = (stageBreakdown[row.stage] ?? 0) + 1;
  }

  return { activeLeads: activeLeads ?? 0, myOpenFollowUps: myOpenFollowUps ?? 0, apptToday: apptToday ?? 0, closedThisMonth: closedThisMonth ?? 0, stageBreakdown };
}

export async function getFabricDashboard() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();

  const [{ data: fabrics }, { data: recentPurchases }, { data: pendingPayments }] = await Promise.all([
    db.from("Fabric").select("id, name, stockQty, reorderLevel, unit").eq("isActive", true).order("stockQty", { ascending: true }),
    db.from("Purchase").select("id, itemName, totalAmount, paidAmount, category, purchaseDate, supplier:Supplier!supplierId(name)").gte("purchaseDate", monthStart).order("purchaseDate", { ascending: false }).limit(8),
    db.from("Purchase").select("id, itemName, totalAmount, paidAmount, supplier:Supplier!supplierId(name)").filter("paidAmount", "lt", "totalAmount").order("purchaseDate", { ascending: true }).limit(10),
  ]);

  const allFabrics = fabrics ?? [];
  const lowStock = allFabrics.filter((f) => f.stockQty <= f.reorderLevel);
  const totalSpendThisMonth = (recentPurchases ?? []).reduce((s, p) => s + (p.totalAmount ?? 0), 0);
  const totalPending = (pendingPayments ?? []).reduce((s, p) => s + ((p.totalAmount ?? 0) - (p.paidAmount ?? 0)), 0);

  return { fabrics: allFabrics, lowStock, recentPurchases: recentPurchases ?? [], pendingPayments: pendingPayments ?? [], totalSpendThisMonth, totalPending };
}

export async function getLogisticsDashboard() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [{ data: readyOrders }, { data: upcomingDeliveries }, { data: overdueDeliveries }] = await Promise.all([
    db.from("Order").select("id, orderNumber, garmentType, deliveryDate, status, customer:Customer!customerId(name, phone)").eq("isActive", true).eq("status", "READY_FOR_DELIVERY").order("deliveryDate", { ascending: true }),
    db.from("Order").select("id, orderNumber, garmentType, deliveryDate, status, customer:Customer!customerId(name, phone)").eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")').gte("deliveryDate", now.toISOString()).lte("deliveryDate", weekOut.toISOString()).order("deliveryDate", { ascending: true }),
    db.from("Order").select("id, orderNumber, garmentType, deliveryDate, status, customer:Customer!customerId(name, phone)").eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")').lt("deliveryDate", now.toISOString()).order("deliveryDate", { ascending: false }).limit(10),
  ]);

  return { readyOrders: readyOrders ?? [], upcomingDeliveries: upcomingDeliveries ?? [], overdueDeliveries: overdueDeliveries ?? [] };
}

export async function getRecentActivities() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  let q = db
    .from("ActivityLog")
    .select(`*, user:User!userId(name), customer:Customer!customerId(name)`);
  if (branchId) q = q.eq("branchId", branchId);

  const { data } = await q.order("createdAt", { ascending: false }).limit(10);

  return (data ?? []).map((a: any) => ({
    ...a,
    user: a.user ? { name: a.user.name } : null,
    customer: a.customer ? { name: a.customer.name } : null,
  }));
}
