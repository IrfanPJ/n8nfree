export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { prisma } from "@/lib/prisma";
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
    return { start: startOfMonth(date), end: endOfMonth(date), label: date.toLocaleString("en-IN", { month: "short", year: "2-digit" }) };
  });

  const [monthlyRevenue, topCustomers, garmentTypes, ordersByMonth] = await Promise.all([
    Promise.all(months.map(async ({ start, end, label }) => {
      const rev = await prisma.invoice.aggregate({
        where: { isActive: true, createdAt: { gte: start, lte: end }, status: "PAID" },
        _sum: { paidAmount: true },
      });
      return { month: label, revenue: rev._sum.paidAmount ?? 0 };
    })),
    prisma.customer.findMany({
      where: { isActive: true },
      take: 10,
      include: {
        orders: { where: { isActive: true } },
        invoices: { where: { isActive: true, status: "PAID" }, select: { paidAmount: true } },
      },
      orderBy: { orders: { _count: "desc" } },
    }),
    prisma.order.groupBy({
      by: ["garmentType"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { garmentType: "desc" } },
      take: 8,
    }),
    Promise.all(months.map(async ({ start, end, label }) => {
      const count = await prisma.order.count({ where: { isActive: true, createdAt: { gte: start, lte: end } } });
      return { month: label, orders: count };
    })),
  ]);

  const topCustomersData = topCustomers.map((c) => ({
    name: c.name,
    orders: c.orders.length,
    revenue: c.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    isVIP: c.isVIP,
  }));

  const chartData = months.map((m, i) => ({
    month: m.label,
    revenue: monthlyRevenue[i].revenue,
    orders: ordersByMonth[i].orders,
  }));

  return (
    <AnalyticsClient
      chartData={chartData}
      topCustomers={topCustomersData}
      garmentTypes={garmentTypes.map((g) => ({ type: g.garmentType, count: g._count }))}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
