export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

function q(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

const KW = {
  revenue:      ["revenue", "sales", "income", "payment", "paid", "invoice", "outstanding", "balance", "advance", "collection", "earning", "money"],
  orders:       ["order", "hot-", "garment", "delivery", "overdue", "suit", "jacket", "shirt", "trousers", "kandura", "sherwani", "waistcoat", "blazer", "tie", "measurement", "cutting", "stitching", "trial", "alteration", "ready", "delivered", "closed", "fabric ordering", "fabric collected", "final stitch", "semi stitch"],
  customers:    ["customer", "client", "buyer", "member", "who"],
  leads:        ["lead", "prospect", "inquiry", "enquiry", "walk-in", "potential"],
  followups:    ["follow up", "followup", "follow-up", "callback", "reminder"],
  appointments: ["appointment", "schedule", "booking", "meeting", "visit"],
  fabrics:      ["fabric", "material", "cloth", "stock", "inventory", "color", "colour"],
  staff:        ["staff", "tailor", "master", "employee", "team", "position", "worker"],
  finance:      ["expense", "purchase", "cost", "profit", "margin", "finance", "cash"],
};

function fmt(d: string | null | undefined) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}
function aed(n: number | null | undefined) {
  return `AED ${(n ?? 0).toLocaleString("en-AE")}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const body = await request.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];
  const raw = (messages[messages.length - 1]?.content ?? "").trim();
  const question = raw.toLowerCase();

  // Extract a search term: any word longer than 2 chars that isn't a stopword
  const stopwords = new Set(["the","and","for","are","all","any","how","what","show","list","find","give","me","is","in","of","to","a","an","with","by","on","at","from","my","our","do","did","does","can","has","have","had","was","were","will","tell","about"]);
  const searchTerms = raw.split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase())).map((w) => w.toLowerCase());

  const lines: string[] = [];
  const fetches: Array<() => Promise<void>> = [];

  // ── Always: summary counts ────────────────────────────────────────────────
  fetches.push(async () => {
    const [
      { count: totalOrders },
      { count: totalCustomers },
      { count: activeOrders },
      { count: totalLeads },
      { data: invoices },
    ] = await Promise.all([
      supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabase.from("Customer").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")'),
      supabase.from("Lead").select("*", { count: "exact", head: true }),
      supabase.from("Invoice").select("paidAmount,balanceAmount").eq("isActive", true),
    ]);
    const paid = (invoices ?? []).reduce((s, r: any) => s + (r.paidAmount ?? 0), 0);
    const outstanding = (invoices ?? []).reduce((s, r: any) => s + (r.balanceAmount ?? 0), 0);
    lines.push(
      "**Business Summary**",
      `- Total Orders: **${totalOrders ?? 0}**`,
      `- Active Orders: **${activeOrders ?? 0}**`,
      `- Total Customers: **${totalCustomers ?? 0}**`,
      `- Total Leads: **${totalLeads ?? 0}**`,
      `- Revenue Collected: **${aed(paid)}**`,
      `- Outstanding Balance: **${aed(outstanding)}**`,
    );
  });

  // ── Orders ─────────────────────────────────────────────────────────────────
  if (q(question, KW.orders) || searchTerms.some((t) => /^hot-/.test(t))) {
    fetches.push(async () => {
      let dbq = supabase.from("Order")
        .select(`orderNumber, status, priority, garmentType, deliveryDate, totalAmount, advanceAmount, customer:Customer!customerId(name, phone), assignedTo:User!assignedToId(name)`)
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(100);

      // If a specific order number or customer name is in the question, filter
      const orderNumTerm = searchTerms.find((t) => t.startsWith("hot-"));
      if (orderNumTerm) dbq = dbq.ilike("orderNumber", `%${orderNumTerm}%`);

      const { data } = await dbq;
      if (!data?.length) { lines.push("\n**Orders:** No orders found."); return; }

      // Status breakdown
      const byStatus: Record<string, number> = {};
      const overdue: typeof data = [];
      const now = new Date();
      data.forEach((o: any) => {
        byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
        if (o.deliveryDate && new Date(o.deliveryDate) < now && !["DELIVERED","ORDER_CLOSED"].includes(o.status)) overdue.push(o);
      });

      lines.push("\n**Order Status Breakdown**");
      Object.entries(byStatus).sort((a,b) => b[1]-a[1]).forEach(([s, c]) => lines.push(`- ${s}: **${c}**`));

      if (overdue.length) {
        lines.push(`\n**⚠️ Overdue Orders (${overdue.length})**`);
        overdue.slice(0,20).forEach((o: any) => lines.push(`- **${o.orderNumber}** | ${(o.customer as any)?.name ?? "?"} | ${o.garmentType} | Due: ${fmt(o.deliveryDate)} | ${o.status}`));
      }

      lines.push(`\n**All Orders (${data.length})**`);
      data.slice(0,50).forEach((o: any) => {
        const balance = (o.totalAmount ?? 0) - (o.advanceAmount ?? 0);
        lines.push(`- **${o.orderNumber}** | ${(o.customer as any)?.name ?? "?"} | ${o.garmentType} | ${o.status} | Delivery: ${fmt(o.deliveryDate)} | ${aed(o.totalAmount)} | Balance: ${aed(balance)}`);
      });
    });
  }

  // ── Customers ──────────────────────────────────────────────────────────────
  if (q(question, KW.customers) || searchTerms.length > 0) {
    fetches.push(async () => {
      let dbq = supabase.from("Customer")
        .select("name, phone, email, notes, createdAt")
        .eq("isActive", true)
        .order("name")
        .limit(100);

      // Search by name if any term present
      if (searchTerms.length > 0 && q(question, KW.customers)) {
        const term = searchTerms[0];
        dbq = (supabase.from("Customer")
          .select("name, phone, email, notes, createdAt")
          .eq("isActive", true)
          .ilike("name", `%${term}%`)
          .limit(50)) as any;
      }

      const { data } = await dbq;
      if (!data?.length) { lines.push("\n**Customers:** No customers found."); return; }
      lines.push(`\n**Customers (${data.length})**`);
      data.forEach((c: any) => lines.push(`- **${c.name}** | ${c.phone ?? "no phone"} | ${c.email ?? "no email"} | Joined: ${fmt(c.createdAt)}`));
    });
  }

  // ── Leads ──────────────────────────────────────────────────────────────────
  if (q(question, KW.leads) || q(question, KW.followups)) {
    fetches.push(async () => {
      const { data: leads } = await supabase.from("Lead")
        .select("name, phone, status, source, garmentType, notes, createdAt")
        .order("createdAt", { ascending: false })
        .limit(50);

      if (leads?.length) {
        const byStatus: Record<string, number> = {};
        leads.forEach((l: any) => { byStatus[l.status] = (byStatus[l.status] ?? 0) + 1; });
        lines.push("\n**Leads**");
        Object.entries(byStatus).forEach(([s, c]) => lines.push(`- ${s}: **${c}**`));
        lines.push("");
        leads.forEach((l: any) => lines.push(`- **${l.name}** | ${l.phone ?? "?"} | ${l.status} | Source: ${l.source ?? "?"} | ${l.garmentType ?? "?"} | ${fmt(l.createdAt)}`));
      }

      const { data: fus } = await supabase.from("FollowUp")
        .select("notes, dueDate, status, lead:Lead!leadId(name)")
        .order("dueDate", { ascending: true })
        .limit(20);

      if (fus?.length) {
        lines.push(`\n**Pending Follow-ups (${fus.length})**`);
        fus.forEach((f: any) => lines.push(`- **${(f.lead as any)?.name ?? "?"}** | Due: ${fmt(f.dueDate)} | ${f.status} | ${f.notes ?? ""}`));
      }
    });
  }

  // ── Revenue / Invoices ─────────────────────────────────────────────────────
  if (q(question, KW.revenue)) {
    fetches.push(async () => {
      const { data } = await supabase.from("Invoice")
        .select("invoiceNumber, totalAmount, paidAmount, balanceAmount, status, dueDate, order:Order!orderId(orderNumber, customer:Customer!customerId(name))")
        .eq("isActive", true)
        .order("createdAt", { ascending: false })
        .limit(50);

      if (!data?.length) { lines.push("\n**Invoices:** No invoice data."); return; }
      const paid = data.filter((i: any) => i.status === "PAID");
      const unpaid = data.filter((i: any) => i.status !== "PAID");
      lines.push(`\n**Invoices (${data.length} total)**`);
      lines.push(`- Paid: **${paid.length}** invoices`);
      lines.push(`- Unpaid/Partial: **${unpaid.length}** invoices`);
      if (unpaid.length) {
        lines.push("\n**Outstanding Invoices**");
        unpaid.slice(0,20).forEach((i: any) => {
          const ord = (i.order as any);
          lines.push(`- **${i.invoiceNumber}** | ${ord?.customer?.name ?? "?"} | ${aed(i.balanceAmount)} due | Due: ${fmt(i.dueDate)} | ${i.status}`);
        });
      }
    });
  }

  // ── Appointments ───────────────────────────────────────────────────────────
  if (q(question, KW.appointments)) {
    fetches.push(async () => {
      const { data } = await supabase.from("Appointment")
        .select("title, date, status, notes, customer:Customer!customerId(name, phone)")
        .order("date", { ascending: true })
        .limit(30);

      if (!data?.length) { lines.push("\n**Appointments:** No appointments found."); return; }
      lines.push(`\n**Appointments (${data.length})**`);
      data.forEach((a: any) => lines.push(`- **${(a.customer as any)?.name ?? "?"}** | ${a.title ?? "Appointment"} | ${fmt(a.date)} | ${a.status}`));
    });
  }

  // ── Fabrics ────────────────────────────────────────────────────────────────
  if (q(question, KW.fabrics)) {
    fetches.push(async () => {
      const { data } = await supabase.from("Fabric")
        .select("name, color, quantity, unit, price, supplier")
        .eq("isActive", true)
        .order("name")
        .limit(50);

      if (!data?.length) { lines.push("\n**Fabrics:** No fabric data."); return; }
      lines.push(`\n**Fabric Inventory (${data.length} items)**`);
      data.forEach((f: any) => lines.push(`- **${f.name}** | ${f.color ?? "?"} | Qty: ${f.quantity} ${f.unit ?? ""} | ${aed(f.price)} | ${f.supplier ?? ""}`));
    });
  }

  // ── Staff ──────────────────────────────────────────────────────────────────
  if (q(question, KW.staff)) {
    fetches.push(async () => {
      const { data } = await supabase.from("User")
        .select("name, role, position, isActive")
        .order("name");

      if (!data?.length) { lines.push("\n**Staff:** No staff found."); return; }
      lines.push(`\n**Team Members (${data.length})**`);
      data.forEach((s: any) => lines.push(`- **${s.name}** | ${s.role} | ${s.position ?? "No position"} | ${s.isActive ? "Active" : "Inactive"}`));
    });
  }

  // ── Finance / Purchases ────────────────────────────────────────────────────
  if (q(question, KW.finance)) {
    fetches.push(async () => {
      const { data } = await supabase.from("Purchase")
        .select("description, amount, category, date, vendor")
        .order("date", { ascending: false })
        .limit(30);

      if (!data?.length) { lines.push("\n**Purchases:** No purchase data."); return; }
      const total = data.reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      lines.push(`\n**Purchases/Expenses (${data.length} records, total ${aed(total)})**`);
      data.forEach((p: any) => lines.push(`- **${p.description ?? "?"}** | ${p.category ?? "?"} | ${aed(p.amount)} | ${fmt(p.date)} | ${p.vendor ?? ""}`));
    });
  }

  // ── Generic name/term search across orders + customers + leads ─────────────
  const isGenericSearch = !q(question, [...KW.orders, ...KW.customers, ...KW.leads, ...KW.followups, ...KW.appointments, ...KW.fabrics, ...KW.staff, ...KW.finance, ...KW.revenue]) && searchTerms.length > 0;

  if (isGenericSearch) {
    fetches.push(async () => {
      const term = searchTerms.join(" ");
      const [{ data: custResults }, { data: orderResults }, { data: leadResults }] = await Promise.all([
        supabase.from("Customer").select("name, phone, email").eq("isActive", true).ilike("name", `%${term}%`).limit(10),
        supabase.from("Order").select(`orderNumber, status, garmentType, deliveryDate, customer:Customer!customerId(name)`).eq("isActive", true).or(`orderNumber.ilike.%${term}%,garmentType.ilike.%${term}%`).limit(10),
        supabase.from("Lead").select("name, phone, status").ilike("name", `%${term}%`).limit(10),
      ]);
      if (custResults?.length) {
        lines.push(`\n**Customers matching "${term}"**`);
        custResults.forEach((c: any) => lines.push(`- **${c.name}** | ${c.phone ?? "no phone"} | ${c.email ?? "no email"}`));
      }
      if (orderResults?.length) {
        lines.push(`\n**Orders matching "${term}"**`);
        orderResults.forEach((o: any) => lines.push(`- **${o.orderNumber}** | ${(o.customer as any)?.name ?? "?"} | ${o.garmentType} | ${o.status} | ${fmt(o.deliveryDate)}`));
      }
      if (leadResults?.length) {
        lines.push(`\n**Leads matching "${term}"**`);
        leadResults.forEach((l: any) => lines.push(`- **${l.name}** | ${l.phone ?? "?"} | ${l.status}`));
      }
      if (!custResults?.length && !orderResults?.length && !leadResults?.length) {
        lines.push(`\nNo results found for **"${term}"**.`);
      }
    });
  }

  await Promise.allSettled(fetches.map((f) => f()));

  const content = lines.join("\n");
  return NextResponse.json({ choices: [{ message: { content } }] });
}
