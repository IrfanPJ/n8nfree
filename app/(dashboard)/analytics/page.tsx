export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./analytics-client";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

async function AnalyticsContent() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
      const { data } = await supabase
        .from("Invoice")
        .select("paidAmount")
        .eq("isActive", true)
        .eq("status", "PAID")
        .gte("createdAt", start.toISOString())
        .lte("createdAt", end.toISOString());
      return { month: label, revenue: data?.reduce((s, r) => s + (r.paidAmount ?? 0), 0) ?? 0 };
    })
  );

  // Orders per month
  const ordersByMonth = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const { count } = await supabase
        .from("Order")
        .select("*", { count: "exact", head: true })
        .eq("isActive", true)
        .gte("createdAt", start.toISOString())
        .lte("createdAt", end.toISOString());
      return { month: label, orders: count ?? 0 };
    })
  );

  // Top customers by order count
  const { data: customersRaw } = await supabase
    .from("Customer")
    .select("id, name, isVIP, Order!customerId(count), Invoice!customerId(id, paidAmount, status, isActive)")
    .eq("isActive", true)
    .limit(50);

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
  const { data: allOrders } = await supabase
    .from("Order")
    .select("garmentType")
    .eq("isActive", true);

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
