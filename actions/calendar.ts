"use server";

import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveReadBranchFilter } from "@/lib/branch-context";
import type { CalendarEvent } from "@/types";

const APPOINTMENT_COLORS: Record<string, string> = {
  FITTING:      "#a78bfa",
  MEASUREMENT:  "#60a5fa",
  TRIAL:        "#fb923c",
  DELIVERY:     "#34d399",
  CONSULTATION: "#f472b6",
  OTHER:        "#94a3b8",
};

export async function getCalendarEvents(params: {
  dateFrom: string;
  dateTo: string;
  types?: Array<"appointment" | "trial" | "delivery">;
}): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());

  const { dateFrom, dateTo, types } = params;
  const includeAll = !types || types.length === 0;
  const includeAppointments = includeAll || types!.includes("appointment");
  const includeTrial = includeAll || types!.includes("trial");
  const includeDelivery = includeAll || types!.includes("delivery");

  const events: CalendarEvent[] = [];

  // ── Appointments ─────────────────────────────────────────────────────────
  if (includeAppointments) {
    let q = db
      .from("Appointment")
      .select("id, title, type, startTime, endTime, customerId, customer:Customer!customerId(name)")
      .eq("isActive", true)
      .gte("startTime", dateFrom)
      .lte("startTime", dateTo)
      .order("startTime");

    if (branchFilter) q = q.eq("branchId", branchFilter);

    const { data: appts } = await q;
    for (const a of appts ?? []) {
      events.push({
        id: `appt-${a.id}`,
        type: "appointment",
        title: a.title,
        start: a.startTime,
        end: a.endTime,
        customerId: a.customerId,
        color: APPOINTMENT_COLORS[a.type] ?? APPOINTMENT_COLORS.OTHER,
      });
    }
  }

  // ── Order trial dates ─────────────────────────────────────────────────────
  if (includeTrial) {
    let q = db
      .from("Order")
      .select("id, customOrderNumber, orderNumber, trialDate, customerId, customer:Customer!customerId(name)")
      .eq("isActive", true)
      .eq("trialRequired", true)
      .not("trialDate", "is", null)
      .gte("trialDate", dateFrom)
      .lte("trialDate", dateTo)
      .order("trialDate");

    if (branchFilter) q = q.eq("branchId", branchFilter);

    const { data: orders } = await q;
    for (const o of orders ?? []) {
      const displayNum = (o as any).customOrderNumber || (o as any).orderNumber;
      const customerName = (o as any).customer?.name ?? "Customer";
      events.push({
        id: `trial-${o.id}`,
        type: "trial",
        title: `Trial: ${customerName} (${displayNum})`,
        start: o.trialDate!,
        customerId: o.customerId,
        orderId: o.id,
        color: "#fb923c",
      });
    }
  }

  // ── Order delivery dates ──────────────────────────────────────────────────
  if (includeDelivery) {
    let q = db
      .from("Order")
      .select("id, customOrderNumber, orderNumber, deliveryDate, customerId, customer:Customer!customerId(name)")
      .eq("isActive", true)
      .not("deliveryDate", "is", null)
      .gte("deliveryDate", dateFrom)
      .lte("deliveryDate", dateTo)
      .order("deliveryDate");

    if (branchFilter) q = q.eq("branchId", branchFilter);

    const { data: orders } = await q;
    for (const o of orders ?? []) {
      const displayNum = (o as any).customOrderNumber || (o as any).orderNumber;
      const customerName = (o as any).customer?.name ?? "Customer";
      events.push({
        id: `delivery-${o.id}`,
        type: "delivery",
        title: `Delivery: ${customerName} (${displayNum})`,
        start: o.deliveryDate!,
        customerId: o.customerId,
        orderId: o.id,
        color: "#34d399",
      });
    }
  }

  // Sort all events by start time
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return events;
}
