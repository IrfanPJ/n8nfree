"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, RevenueData, OrderStatusData } from "@/types";

async function countWhere(table: string, filters: Record<string, unknown>): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count } = await q;
  return count ?? 0;
}

async function countRange(
  table: string,
  base: Record<string, unknown>,
  rangeCol: string,
  start: Date,
  end: Date
): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(base)) q = q.eq(k, v);
  q = q.gte(rangeCol, start.toISOString()).lte(rangeCol, end.toISOString());
  const { count } = await q;
  return count ?? 0;
}

async function sumRevenue(start: Date, end: Date): Promise<number> {
  const { data } = await supabase
    .from("Invoice")
    .select("paidAmount")
    .eq("isActive", true)
    .eq("status", "PAID")
    .gte("createdAt", start.toISOString())
    .lte("createdAt", end.toISOString());
  return data?.reduce((s, r) => s + (r.paidAmount ?? 0), 0) ?? 0;
}

async function sumPOSRevenue(start: Date, end: Date): Promise<number> {
  const { data } = await supabase
    .from("POSSale")
    .select("total")
    .gte("createdAt", start.toISOString())
    .lte("createdAt", end.toISOString());
  return data?.reduce((s, r) => s + (r.total ?? 0), 0) ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const curStart = startOfMonth(now);
  const curEnd = endOfMonth(now);
  const lastStart = startOfMonth(subMonths(now, 1));
  const lastEnd = endOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
    countWhere("Order", { isActive: true }),
    supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")').then(r => r.count ?? 0),
    countWhere("Order", { isActive: true, status: "DELIVERED" }),
    countWhere("Customer", { isActive: true }),
    countRange("Customer", { isActive: true }, "createdAt", curStart, curEnd),
    countRange("Customer", { isActive: true }, "createdAt", lastStart, lastEnd),
    sumRevenue(curStart, curEnd),
    sumRevenue(lastStart, lastEnd),
    countRange("Order", { isActive: true }, "createdAt", curStart, curEnd),
    countRange("Order", { isActive: true }, "createdAt", lastStart, lastEnd),
    supabase.from("Appointment").select("*", { count: "exact", head: true }).eq("isActive", true).gte("startTime", todayStart.toISOString()).lte("startTime", todayEnd.toISOString()).then(r => r.count ?? 0),
    supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "READY_FOR_DELIVERY").gte("deliveryDate", now.toISOString()).lte("deliveryDate", weekOut.toISOString()).then(r => r.count ?? 0),
    countWhere("Invoice", { isActive: true, status: "OVERDUE" }),
    supabase.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID").then(r => r.data?.reduce((s, i) => s + (i.paidAmount ?? 0), 0) ?? 0),
    // POS
    supabase.from("POSSale").select("*", { count: "exact", head: true }).gte("createdAt", todayStart.toISOString()).lte("createdAt", todayEnd.toISOString()).then(r => r.count ?? 0),
    sumPOSRevenue(todayStart, todayEnd),
    supabase.from("POSSale").select("total").then(r => r.data?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0),
    // Leads
    supabase.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST")').then(r => r.count ?? 0),
    supabase.from("Lead").select("*", { count: "exact", head: true }).eq("isActive", true).eq("stage", "CLOSED_WON").then(r => r.count ?? 0),
    supabase.from("Lead").select("value").eq("isActive", true).not("stage", "in", '("CLOSED_WON","CLOSED_LOST")').then(r => r.data?.reduce((s, i) => s + (i.value ?? 0), 0) ?? 0),
    // Fabrics
    supabase.from("Fabric").select("stockQty, reorderLevel").eq("isActive", true),
    // Follow-ups
    supabase.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "PENDING").then(r => r.count ?? 0),
    supabase.from("FollowUp").select("*", { count: "exact", head: true }).eq("isActive", true).eq("status", "PENDING").lt("dueDate", now.toISOString()).then(r => r.count ?? 0),
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

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: date.toLocaleString("en-AE", { month: "short" }) };
  });

  return Promise.all(
    months.map(async ({ start, end, label }) => {
      const [rev, orderCount] = await Promise.all([
        sumRevenue(start, end),
        countRange("Order", { isActive: true }, "createdAt", start, end),
      ]);
      return { month: label, revenue: rev, orders: orderCount };
    })
  );
}

export async function getOrderStatusData(): Promise<OrderStatusData[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

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
    statuses.map((s) => countWhere("Order", { isActive: true, status: s }))
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

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, status, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .lte("deliveryDate", sevenDaysOut.toISOString())
    .order("deliveryDate", { ascending: true });

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

  const MAX_SLOTS = 20;
  const { count } = await supabase
    .from("Order")
    .select("*", { count: "exact", head: true })
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")');

  const current = count ?? 0;
  return { current, max: MAX_SLOTS, percentage: Math.round((current / MAX_SLOTS) * 100) };
}

export async function getNextDelivery() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, customer:Customer!customerId(name)")
    .eq("isActive", true)
    .not("status", "in", '("DELIVERED","ORDER_CLOSED")')
    .gte("deliveryDate", new Date().toISOString())
    .order("deliveryDate", { ascending: true })
    .limit(1);

  return data?.[0] ?? null;
}

export async function getBookingHeatmap() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const { data } = await supabase
    .from("Appointment")
    .select("startTime")
    .eq("isActive", true)
    .gte("startTime", fourWeeksAgo.toISOString());

  const counts = [0, 0, 0, 0, 0, 0, 0];
  data?.forEach((apt: any) => {
    const day = new Date(apt.startTime).getDay();
    counts[day]++;
  });
  return counts;
}

export async function getTodayAppointments() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const { data } = await supabase
    .from("Appointment")
    .select("id, title, type, startTime, endTime, status, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .gte("startTime", todayStart.toISOString())
    .lte("startTime", todayEnd.toISOString())
    .order("startTime", { ascending: true });

  return data ?? [];
}

export async function getReadyOrders() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Order")
    .select("id, orderNumber, garmentType, deliveryDate, customer:Customer!customerId(name, phone)")
    .eq("isActive", true)
    .eq("status", "READY_FOR_DELIVERY")
    .order("deliveryDate", { ascending: true })
    .limit(10);

  return data ?? [];
}

export async function getRecentActivities() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("ActivityLog")
    .select(`*, user:User!userId(name), customer:Customer!customerId(name)`)
    .order("createdAt", { ascending: false })
    .limit(10);

  return (data ?? []).map((a: any) => ({
    ...a,
    user: a.user ? { name: a.user.name } : null,
    customer: a.customer ? { name: a.customer.name } : null,
  }));
}
