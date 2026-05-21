"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";

export async function getFinanceStats() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const curStart = startOfMonth(now);
  const curEnd = endOfMonth(now);

  const [invoiceRevenue, posRevenue, purchases, outstanding, draftInvoices] = await Promise.all([
    supabase.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString())
      .then(r => r.data?.reduce((s, i) => s + (i.paidAmount ?? 0), 0) ?? 0),
    supabase.from("POSSale").select("total")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString())
      .then(r => r.data?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0),
    supabase.from("Purchase").select("totalAmount")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString())
      .then(r => r.data?.reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0),
    supabase.from("Invoice").select("dueAmount").eq("isActive", true)
      .in("status", ["SENT", "PARTIAL", "OVERDUE"])
      .then(r => r.data?.reduce((s, i) => s + (i.dueAmount ?? 0), 0) ?? 0),
    supabase.from("Invoice").select("*", { count: "exact", head: true })
      .eq("isActive", true).eq("status", "DRAFT")
      .then(r => r.count ?? 0),
  ]);

  const revenueMTD = invoiceRevenue + posRevenue;
  const expensesMTD = purchases;
  const netProfitMTD = revenueMTD - expensesMTD;

  return { revenueMTD, expensesMTD, netProfitMTD, outstanding, draftInvoices, invoiceRevenue, posRevenue };
}

export async function getMonthlyFinance() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: date.toLocaleString("en-AE", { month: "short" }),
    };
  });

  return Promise.all(
    months.map(async ({ start, end, label }) => {
      const [invoiceRev, posRev, expenses] = await Promise.all([
        supabase.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString())
          .then(r => r.data?.reduce((s, i) => s + (i.paidAmount ?? 0), 0) ?? 0),
        supabase.from("POSSale").select("total")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString())
          .then(r => r.data?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0),
        supabase.from("Purchase").select("totalAmount")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString())
          .then(r => r.data?.reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0),
      ]);
      return { month: label, revenue: invoiceRev + posRev, expenses, profit: (invoiceRev + posRev) - expenses };
    })
  );
}

export async function getTopClientsByRevenue() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Invoice")
    .select("customerId, paidAmount, customer:Customer!customerId(name)")
    .eq("isActive", true)
    .eq("status", "PAID");

  const map: Record<string, { name: string; total: number }> = {};
  for (const row of data ?? []) {
    const id = row.customerId;
    if (!map[id]) map[id] = { name: (row.customer as any)?.name ?? "Unknown", total: 0 };
    map[id].total += row.paidAmount ?? 0;
  }

  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}
