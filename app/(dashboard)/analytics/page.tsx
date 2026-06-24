export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveReadBranchFilter } from "@/lib/branch-context";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./analytics-client";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

async function AnalyticsContent() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const db = await getScopedClient(session);
  const branchId = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: date.toLocaleString("en-AE", { month: "short", year: "2-digit" }),
    };
  });

  // Monthly revenue: fetch paid invoices per month
  const monthlyRevenue = await Promise.all(
    months.map(async ({ start, end, label }) => {
      let q = db
        .from("Invoice")
        .select("paidAmount")
        .eq("isActive", true)
        .eq("status", "PAID")
        .gte("createdAt", start.toISOString())
        .lte("createdAt", end.toISOString());
      if (branchId) q = q.eq("branchId", branchId);
      const { data } = await q;
      return { month: label, revenue: data?.reduce((s, r) => s + (r.paidAmount ?? 0), 0) ?? 0 };
    })
  );

  // Orders per month
  const ordersByMonth = await Promise.all(
    months.map(async ({ start, end, label }) => {
      let q = db
        .from("Order")
        .select("*", { count: "exact", head: true })
        .eq("isActive", true)
        .gte("createdAt", start.toISOString())
        .lte("createdAt", end.toISOString());
      if (branchId) q = q.eq("branchId", branchId);
      const { count } = await q;
      return { month: label, orders: count ?? 0 };
    })
  );

  // Top customers by order count
  let customersQ = db
    .from("Customer")
    .select("id, name, isVIP, Order!customerId(count), Invoice!customerId(id, paidAmount, status, isActive)")
    .eq("isActive", true);
  if (branchId) customersQ = customersQ.eq("branchId", branchId);
  const { data: customersRaw } = await customersQ.limit(50);

  const topCustomers = (customersRaw ?? [])
    .map((c: any) => ({
      name: c.name,
      isVIP: c.isVIP,
      orders: c.Order?.[0]?.count ?? 0,
      revenue: (c.Invoice ?? [])
        .filter((inv: any) => inv.status === "PAID" && inv.isActive)
        .reduce((s: number, inv: any) => s + (inv.paidAmount ?? 0), 0),
    }))
    .sort((a: any, b: any) => b.orders - a.orders)
    .slice(0, 10);

  // Garment type breakdown
  let garmentQ = db
    .from("Order")
    .select("garmentType")
    .eq("isActive", true);
  if (branchId) garmentQ = garmentQ.eq("branchId", branchId);
  const { data: allOrders } = await garmentQ;

  const garmentMap = new Map<string, number>();
  for (const o of allOrders ?? []) {
    garmentMap.set(o.garmentType, (garmentMap.get(o.garmentType) ?? 0) + 1);
  }
  const garmentTypes = Array.from(garmentMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([type, count]) => ({ type, count }));

  const chartData = months.map((m, i) => ({
    month: m.label,
    revenue: monthlyRevenue[i].revenue,
    orders: ordersByMonth[i].orders,
  }));

  return (
    <AnalyticsClient
      chartData={chartData}
      topCustomers={topCustomers}
      garmentTypes={garmentTypes}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
