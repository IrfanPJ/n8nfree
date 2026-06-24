import { supabase } from "@/lib/supabase";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveReadBranchFilter } from "@/lib/branch-context";

export function fmt(d: string | null | undefined) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}

export function aed(n: number | null | undefined) {
  return `AED ${(n ?? 0).toLocaleString("en-AE")}`;
}

type AiSession = { user: { id: string; role: string; branches?: string[] | null } };

/**
 * Builds the live business-data context fed to the AI assistant.
 * - Called with a session (web AI Assistant chat) -> scoped to the caller's
 *   branch via the same RLS-backed client every other action uses.
 * - Called with no session (Telegram bot, gated by TELEGRAM_ALLOWED_CHAT_IDS
 *   and not tied to any CRM user) -> full cross-branch owner view, by design.
 */
export async function fetchBusinessContext(session?: AiSession): Promise<string> {
  const db = session ? await getScopedClient(session) : supabase;
  const branchId = session ? resolveReadBranchFilter(session, await getActiveBranchCookie()) : undefined;

  let totalOrdersQ = db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true);
  let activeOrdersQ = db.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")');
  let totalCustomersQ = db.from("Customer").select("*", { count: "exact", head: true }).eq("isActive", true);
  let totalLeadsQ = db.from("Lead").select("*", { count: "exact", head: true });
  let invoicesQ = db.from("Invoice").select("invoiceNumber, totalAmount, paidAmount, balanceAmount, status, dueDate, order:Order!orderId(orderNumber, customer:Customer!customerId(name))").eq("isActive", true);
  let ordersQ = db.from("Order").select("orderNumber, status, garmentType, deliveryDate, totalAmount, advanceAmount, priority, notes, customer:Customer!customerId(name, phone), assignedTo:User!assignedToId(name)").eq("isActive", true);
  let customersQ = db.from("Customer").select("name, phone, email, notes, createdAt").eq("isActive", true);
  let leadsQ = db.from("Lead").select("name, phone, status, source, garmentType, notes, createdAt");
  let followupsQ = db.from("FollowUp").select("notes, dueDate, status, lead:Lead!leadId(name, phone)");
  let appointmentsQ = db.from("Appointment").select("title, startTime, endTime, status, notes, customer:Customer!customerId(name, phone)").eq("isActive", true);
  let purchasesQ = db.from("Purchase").select("description, amount, category, date, vendor");

  if (branchId) {
    totalOrdersQ = totalOrdersQ.eq("branchId", branchId);
    activeOrdersQ = activeOrdersQ.eq("branchId", branchId);
    totalCustomersQ = totalCustomersQ.eq("branchId", branchId);
    totalLeadsQ = totalLeadsQ.eq("branchId", branchId);
    invoicesQ = invoicesQ.eq("branchId", branchId);
    ordersQ = ordersQ.eq("branchId", branchId);
    customersQ = customersQ.eq("branchId", branchId);
    leadsQ = leadsQ.eq("branchId", branchId);
    followupsQ = followupsQ.eq("branchId", branchId);
    appointmentsQ = appointmentsQ.eq("branchId", branchId);
    purchasesQ = purchasesQ.eq("branchId", branchId);
  }

  const [
    { count: totalOrders },
    { count: activeOrders },
    { count: totalCustomers },
    { count: totalLeads },
    { data: invoices },
    { data: orders },
    { data: customers },
    { data: leads },
    { data: followups },
    { data: appointments },
    { data: staff },
    { data: purchases },
  ] = await Promise.all([
    totalOrdersQ,
    activeOrdersQ,
    totalCustomersQ,
    totalLeadsQ,
    invoicesQ.order("createdAt", { ascending: false }).limit(50),
    ordersQ.order("createdAt", { ascending: false }).limit(100),
    customersQ.order("name").limit(100),
    leadsQ.order("createdAt", { ascending: false }).limit(50),
    followupsQ.order("dueDate", { ascending: true }).limit(30),
    appointmentsQ.order("startTime", { ascending: false }).limit(100),
    db.from("User").select("name, role, position, isActive").order("name"),
    purchasesQ.order("date", { ascending: false }).limit(30),
  ]);

  const paid = (invoices ?? []).reduce((s, r: any) => s + (r.paidAmount ?? 0), 0);
  const outstanding = (invoices ?? []).reduce((s, r: any) => s + (r.balanceAmount ?? 0), 0);
  const now = new Date();

  const overdueOrders = (orders ?? []).filter((o: any) =>
    o.deliveryDate && new Date(o.deliveryDate) < now && !["DELIVERED", "ORDER_CLOSED"].includes(o.status)
  );

  const byStatus: Record<string, number> = {};
  (orders ?? []).forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

  const sections: string[] = [];

  sections.push(`## Business Summary
- Total Orders: ${totalOrders ?? 0}
- Active (in-progress) Orders: ${activeOrders ?? 0}
- Overdue Orders: ${overdueOrders.length}
- Total Customers: ${totalCustomers ?? 0}
- Total Leads: ${totalLeads ?? 0}
- Revenue Collected: ${aed(paid)}
- Outstanding Balance: ${aed(outstanding)}`);

  sections.push(`## Order Status Breakdown\n${Object.entries(byStatus).map(([s, c]) => `- ${s}: ${c}`).join("\n")}`);

  if (overdueOrders.length) {
    sections.push(`## Overdue Orders\n${overdueOrders.slice(0, 20).map((o: any) =>
      `- ${o.orderNumber} | ${(o.customer as any)?.name} | ${o.garmentType} | Due: ${fmt(o.deliveryDate)} | ${o.status}`
    ).join("\n")}`);
  }

  if (orders?.length) {
    sections.push(`## All Orders (${orders.length})\n${orders.map((o: any) => {
      const balance = (o.totalAmount ?? 0) - (o.advanceAmount ?? 0);
      return `- ${o.orderNumber} | Customer: ${(o.customer as any)?.name ?? "?"} | Phone: ${(o.customer as any)?.phone ?? "N/A"} | Garment: ${o.garmentType} | Status: ${o.status} | Priority: ${o.priority} | Delivery: ${fmt(o.deliveryDate)} | Total: ${aed(o.totalAmount)} | Balance: ${aed(balance)} | Tailor: ${(o.assignedTo as any)?.name ?? "Unassigned"}`;
    }).join("\n")}`);
  }

  if (customers?.length) {
    sections.push(`## Customers (${customers.length})\n${customers.map((c: any) =>
      `- ${c.name} | Phone: ${c.phone ?? "N/A"} | Email: ${c.email ?? "N/A"} | Joined: ${fmt(c.createdAt)}${c.notes ? ` | Notes: ${c.notes}` : ""}`
    ).join("\n")}`);
  }

  if (leads?.length) {
    const leadByStatus: Record<string, number> = {};
    leads.forEach((l: any) => { leadByStatus[l.status] = (leadByStatus[l.status] ?? 0) + 1; });
    sections.push(`## Leads (${leads.length})\nBy status: ${Object.entries(leadByStatus).map(([s, c]) => `${s}: ${c}`).join(", ")}\n${leads.map((l: any) =>
      `- ${l.name} | Phone: ${l.phone ?? "N/A"} | Status: ${l.status} | Source: ${l.source ?? "N/A"} | Garment: ${l.garmentType ?? "N/A"} | Date: ${fmt(l.createdAt)}`
    ).join("\n")}`);
  }

  if (followups?.length) {
    sections.push(`## Pending Follow-ups (${followups.length})\n${followups.map((f: any) =>
      `- ${(f.lead as any)?.name ?? "?"} | Due: ${fmt(f.dueDate)} | Status: ${f.status} | Notes: ${f.notes ?? ""}`
    ).join("\n")}`);
  }

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
  const thisMonthAppts = (appointments ?? []).filter((a: any) => a.startTime >= thisMonthStart && a.startTime <= thisMonthEnd);
  const nextMonthAppts = (appointments ?? []).filter((a: any) => a.startTime >= nextMonthStart && a.startTime <= nextMonthEnd);
  sections.push(`## Appointments (total: ${(appointments ?? []).length}, this month: ${thisMonthAppts.length}, next month: ${nextMonthAppts.length})
${(appointments ?? []).length === 0
    ? "No appointments found in the database."
    : (appointments ?? []).map((a: any) =>
        `- ${(a.customer as any)?.name ?? "?"} | ${a.title ?? "Appointment"} | Date: ${fmt(a.startTime)} | Status: ${a.status}`
      ).join("\n")
  }`);

  if (invoices?.length) {
    const unpaid = (invoices ?? []).filter((i: any) => i.status !== "PAID");
    sections.push(`## Invoices\n- Total paid: ${aed(paid)}\n- Total outstanding: ${aed(outstanding)}\n- Unpaid/partial invoices: ${unpaid.length}${unpaid.length ? "\n" + unpaid.slice(0, 15).map((i: any) =>
      `  - ${i.invoiceNumber} | ${(i.order as any)?.customer?.name ?? "?"} | Balance: ${aed(i.balanceAmount)} | Due: ${fmt(i.dueDate)} | ${i.status}`
    ).join("\n") : ""}`);
  }

  if (staff?.length) {
    sections.push(`## Team / Staff (${staff.length})\n${staff.map((s: any) =>
      `- ${s.name} | Role: ${s.role} | Position: ${s.position ?? "N/A"} | ${s.isActive ? "Active" : "Inactive"}`
    ).join("\n")}`);
  }

  if (purchases?.length) {
    const totalExpenses = (purchases ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
    sections.push(`## Expenses / Purchases (${purchases.length} records, total: ${aed(totalExpenses)})\n${purchases.map((p: any) =>
      `- ${p.description ?? "?"} | ${p.category ?? "?"} | ${aed(p.amount)} | ${fmt(p.date)} | Vendor: ${p.vendor ?? "N/A"}`
    ).join("\n")}`);
  }

  return sections.join("\n\n");
}

export function buildSystemInstruction(context: string): string {
  return `You are an intelligent AI assistant for House of Tailors, a premium tailoring and bespoke clothing business based in UAE.
You have access to live business data fetched directly from the database, provided below.
Answer questions naturally, helpfully, and concisely. Use simple formatting (no heavy markdown for messaging apps).
When listing orders, customers, or leads, present them in a clear structured format.
Always base your answers strictly on the data provided — do not fabricate numbers or names.
Today's date is ${new Date().toLocaleDateString("en-AE", { day: "2-digit", month: "long", year: "numeric" })}.
Currency is AED (UAE Dirham).

--- LIVE BUSINESS DATA ---
${context}
--- END OF DATA ---`;
}

export async function callGemini(systemInstruction: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";
}
