"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import type { DashboardStats, RevenueData, OrderStatusData } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    totalCustomers,
    currentMonthCustomers,
    lastMonthCustomers,
    currentMonthRevenue,
    lastMonthRevenue,
    currentMonthOrders,
    lastMonthOrders,
    todayAppointments,
    upcomingDeliveries,
    overdueInvoices,
  ] = await Promise.all([
    prisma.order.count({ where: { isActive: true } }),
    prisma.order.count({ where: { isActive: true, status: { in: ["PENDING", "MEASURING", "CUTTING", "STITCHING", "TRIAL"] } } }),
    prisma.order.count({ where: { isActive: true, status: "DELIVERED" } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { isActive: true, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } } }),
    prisma.customer.count({ where: { isActive: true, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.invoice.aggregate({
      where: { isActive: true, createdAt: { gte: currentMonthStart, lte: currentMonthEnd }, status: "PAID" },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { isActive: true, createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: "PAID" },
      _sum: { paidAmount: true },
    }),
    prisma.order.count({ where: { isActive: true, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } } }),
    prisma.order.count({ where: { isActive: true, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.appointment.count({
      where: { isActive: true, startTime: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.order.count({
      where: { isActive: true, deliveryDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, status: "READY" },
    }),
    prisma.invoice.count({ where: { isActive: true, status: "OVERDUE" } }),
  ]);

  const currentRev = currentMonthRevenue._sum.paidAmount ?? 0;
  const lastRev = lastMonthRevenue._sum.paidAmount ?? 0;
  const revenueGrowth = lastRev === 0 ? 100 : ((currentRev - lastRev) / lastRev) * 100;
  const orderGrowth = lastMonthOrders === 0 ? 100 : ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;
  const customerGrowth = lastMonthCustomers === 0 ? 100 : ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100;

  const totalRevResult = await prisma.invoice.aggregate({
    where: { isActive: true, status: "PAID" },
    _sum: { paidAmount: true },
  });

  return {
    totalRevenue: totalRevResult._sum.paidAmount ?? 0,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalCustomers,
    newCustomers: currentMonthCustomers,
    todayAppointments,
    upcomingDeliveries,
    overdueInvoices,
    revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    orderGrowth: Math.round(orderGrowth * 10) / 10,
    customerGrowth: Math.round(customerGrowth * 10) / 10,
  };
}

export async function getRevenueData(): Promise<RevenueData[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date) };
  });

  const data = await Promise.all(
    months.map(async ({ start, end }) => {
      const [revenue, orders] = await Promise.all([
        prisma.invoice.aggregate({
          where: { isActive: true, createdAt: { gte: start, lte: end }, status: "PAID" },
          _sum: { paidAmount: true },
        }),
        prisma.order.count({ where: { isActive: true, createdAt: { gte: start, lte: end } } }),
      ]);
      return {
        month: start.toLocaleString("en-IN", { month: "short" }),
        revenue: revenue._sum.paidAmount ?? 0,
        orders,
      };
    })
  );

  return data;
}

export async function getOrderStatusData(): Promise<OrderStatusData[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const statuses = ["PENDING", "MEASURING", "CUTTING", "STITCHING", "TRIAL", "READY", "DELIVERED", "CANCELLED"] as const;
  const colors = ["#fbbf24", "#60a5fa", "#f97316", "#a78bfa", "#22d3ee", "#4ade80", "#34d399", "#f87171"];

  const counts = await Promise.all(
    statuses.map((status) =>
      prisma.order.count({ where: { isActive: true, status } })
    )
  );

  return statuses.map((status, i) => ({
    status: status.charAt(0) + status.slice(1).toLowerCase(),
    count: counts[i],
    color: colors[i],
  }));
}

export async function getRecentActivities() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.activityLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });
}
