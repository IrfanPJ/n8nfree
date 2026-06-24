"use server";

import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveReadBranchFilter } from "@/lib/branch-context";
import * as Sentry from "@sentry/nextjs";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function getFinanceStats() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  try {
    const now = new Date();
    const curStart = startOfMonth(now);
    const curEnd = endOfMonth(now);

    let invoiceQ = db.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString());
    let posQ = db.from("POSSale").select("total")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString());
    let purchaseQ = db.from("Purchase").select("totalAmount")
      .gte("createdAt", curStart.toISOString()).lte("createdAt", curEnd.toISOString());
    let outstandingQ = db.from("Invoice").select("dueAmount").eq("isActive", true)
      .in("status", ["SENT", "PARTIAL", "OVERDUE"]);
    let draftQ = db.from("Invoice").select("*", { count: "exact", head: true })
      .eq("isActive", true).eq("status", "DRAFT");

    if (branchFilter) {
      invoiceQ = invoiceQ.eq("branchId", branchFilter);
      posQ = posQ.eq("branchId", branchFilter);
      purchaseQ = purchaseQ.eq("branchId", branchFilter);
      outstandingQ = outstandingQ.eq("branchId", branchFilter);
      draftQ = draftQ.eq("branchId", branchFilter);
    }

    const [invoiceRevenue, posRevenue, purchases, outstanding, draftInvoices] = await Promise.all([
      invoiceQ.then(r => r.data?.reduce((s, i) => s + (i.paidAmount ?? 0), 0) ?? 0),
      posQ.then(r => r.data?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0),
      purchaseQ.then(r => r.data?.reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0),
      outstandingQ.then(r => r.data?.reduce((s, i) => s + (i.dueAmount ?? 0), 0) ?? 0),
      draftQ.then(r => r.count ?? 0),
    ]);

    const revenueMTD = invoiceRevenue + posRevenue;
    const expensesMTD = purchases;
    const netProfitMTD = revenueMTD - expensesMTD;

    return { revenueMTD, expensesMTD, netProfitMTD, outstanding, draftInvoices, invoiceRevenue, posRevenue };
  } catch (error) {
    Sentry.captureException(error);
    console.error("getFinanceStats error:", error);
    return { revenueMTD: 0, expensesMTD: 0, netProfitMTD: 0, outstanding: 0, draftInvoices: 0, invoiceRevenue: 0, posRevenue: 0 };
  }
}

export async function getMonthlyFinance() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  try {
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
        let invoiceQ = db.from("Invoice").select("paidAmount").eq("isActive", true).eq("status", "PAID")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString());
        let posQ = db.from("POSSale").select("total")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString());
        let purchaseQ = db.from("Purchase").select("totalAmount")
          .gte("createdAt", start.toISOString()).lte("createdAt", end.toISOString());

        if (branchFilter) {
          invoiceQ = invoiceQ.eq("branchId", branchFilter);
          posQ = posQ.eq("branchId", branchFilter);
          purchaseQ = purchaseQ.eq("branchId", branchFilter);
        }

        const [invoiceRev, posRev, expenses] = await Promise.all([
          invoiceQ.then(r => r.data?.reduce((s, i) => s + (i.paidAmount ?? 0), 0) ?? 0),
          posQ.then(r => r.data?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0),
          purchaseQ.then(r => r.data?.reduce((s, i) => s + (i.totalAmount ?? 0), 0) ?? 0),
        ]);
        return { month: label, revenue: invoiceRev + posRev, expenses, profit: (invoiceRev + posRev) - expenses };
      })
    );
  } catch (error) {
    Sentry.captureException(error);
    console.error("getMonthlyFinance error:", error);
    return [];
  }
}

export async function getTopClientsByRevenue() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  try {
    let q = db
      .from("Invoice")
      .select("customerId, paidAmount, customer:Customer!customerId(name)")
      .eq("isActive", true)
      .eq("status", "PAID");
    if (branchFilter) q = q.eq("branchId", branchFilter);

    const { data } = await q;

    const map: Record<string, { name: string; total: number }> = {};
    for (const row of data ?? []) {
      const id = row.customerId;
      if (!map[id]) map[id] = { name: (row.customer as any)?.name ?? "Unknown", total: 0 };
      map[id].total += row.paidAmount ?? 0;
    }

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  } catch (error) {
    Sentry.captureException(error);
    console.error("getTopClientsByRevenue error:", error);
    return [];
  }
}
