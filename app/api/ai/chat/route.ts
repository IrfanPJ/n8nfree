export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Simple in-memory rate limiter: 20 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// ── keyword detection ──────────────────────────────────────────────────────────
function detect(q: string, keywords: string[]) {
  return keywords.some((k) => q.includes(k));
}

const KW = {
  revenue:      ["revenue", "sales", "income", "payment", "paid", "invoice", "outstanding", "balance", "advance", "collection", "earning"],
  orders:       ["order", "hot-", "garment", "delivery", "overdue", "urgent", "suit", "jacket", "shirt", "trousers", "kandura", "sherwani", "waistcoat", "blazer", "tie"],
  status:       ["measurement", "cutting", "stitching", "semi stitch", "trial", "alteration", "ready", "delivered", "closed", "fabric ordering", "fabric collected", "final stitch"],
  customers:    ["customer", "client", "buyer", "member"],
  leads:        ["lead", "prospect", "inquiry", "enquiry", "walk-in", "potential"],
  followups:    ["follow up", "followup", "follow-up", "callback", "reminder"],
  appointments: ["appointment", "schedule", "booking", "meeting", "visit"],
  fabrics:      ["fabric", "material", "cloth", "stock", "inventory", "color", "colour"],
  staff:        ["staff", "tailor", "master", "employee", "team", "position", "worker"],
  finance:      ["expense", "purchase", "cost", "profit", "margin", "finance", "cash"],
};

// ── build context from DB based on detected intents ───────────────────────────
async function buildContext(q: string): Promise<string> {
  const intent = {
    revenue:      detect(q, KW.revenue),
    orders:       detect(q, KW.orders) || detect(q, KW.status),
    customers:    detect(q, KW.customers),
    leads:        detect(q, KW.leads) || detect(q, KW.followups),
    appointments: detect(q, KW.appointments),
    fabrics:      detect(q, KW.fabrics),
    staff:        detect(q, KW.staff),
    finance:      detect(q, KW.finance),
  };

  // If nothing matched, load everything at summary level
  const wantsAll = !Object.values(intent).some(Boolean);

  const fetches: Promise<any>[] = [];

  // Always fetch core summary counts
  fetches.push(
    Promise.all([
      supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabase.from("Customer").select("*", { count: "exact", head: true }).eq("isActive", true),
      supabase.from("Order").select("*", { count: "exact", head: true }).eq("isActive", true).not("status", "in", '("DELIVERED","ORDER_CLOSED")'),
      supabase.from("Invoice").select("paidAmount,totalAmount,balanceAmount").eq("isActive", true),
    ])
  );

  // Orders detail
  if (intent.orders || wantsAll) {
    fetches.push(
      supabase.from("Order").select(`
        orderNumber, status, priority, garmentType, deliveryDate, totalAmount, advanceAmount,
        customer:Customer!customerId(name, phone),
        assignedTo:User!assignedToId(name)
      `).eq("isActive", true).order("createdAt", { ascending: false }).limit(50)
    );
  }

  // Customers detail
  if (intent.customers || wantsAll) {
    fetches.push(
      supabase.from("Customer").select("name, phone, email, createdAt")
        .eq("isActive", true).order("createdAt", { ascending: false }).limit(50)
    );
  }

  // Leads
  if (intent.leads || wantsAll) {
    fetches.push(
      supabase.from("Lead").select("name, phone, status, source, garmentType, notes, createdAt")
        .order("createdAt", { ascending: false }).limit(30)
    );
  }

  // Follow-ups
  if (intent.leads || wantsAll) {
    fetches.push(
      supabase.from("FollowUp").select("notes, dueDate, status, lead:Lead!leadId(name)").limit(20)
    );
  }

  // Appointments
  if (intent.appointments || wantsAll) {
    fetches.push(
      supabase.from("Appointment").select("title, date, status, customer:Customer!customerId(name)").limit(20)
    );
  }

  // Fabrics
  if (intent.fabrics || wantsAll) {
    fetches.push(
      supabase.from("Fabric").select("name, color, quantity, unit, price").eq("isActive", true).limit(30)
    );
  }

  // Staff
  if (intent.staff || wantsAll) {
    fetches.push(
      supabase.from("User").select("name, role, position, isActive").eq("isActive", true)
    );
  }

  // Finance / purchases
  if (intent.finance || wantsAll) {
    fetches.push(
      supabase.from("Purchase").select("description, amount, category, date").order("date", { ascending: false }).limit(20)
    );
  }

  const results = await Promise.allSettled(fetches);

  // ── Parse core summary ────────────────────────────────────────────────────
  const [totalOrdersRes, totalCustomersRes, pendingOrdersRes, invoicesRes] =
    (results[0] as PromiseFulfilledResult<any>).value ?? [];

  const totalOrders = totalOrdersRes?.count ?? 0;
  const totalCustomers = totalCustomersRes?.count ?? 0;
  const pendingOrders = pendingOrdersRes?.count ?? 0;
  const invoices = invoicesRes?.data ?? [];
  const totalRevenue = invoices.reduce((s: number, r: any) => s + (r.paidAmount ?? 0), 0);
  const totalOutstanding = invoices.reduce((s: number, r: any) => s + (r.balanceAmount ?? 0), 0);

  let ctx = `You are the AI assistant for "House of Tailors" luxury tailoring CRM.

## Live Business Snapshot
- Total Orders: ${totalOrders}
- Total Customers: ${totalCustomers}
- Active/Pending Orders: ${pendingOrders}
- Total Revenue Collected: AED ${totalRevenue.toLocaleString("en-AE")}
- Total Outstanding Balance: AED ${totalOutstanding.toLocaleString("en-AE")}
`;

  let idx = 1;

  // Orders detail
  if (intent.orders || wantsAll) {
    const orderData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (orderData.length > 0) {
      const byStatus: Record<string, number> = {};
      const overdue: any[] = [];
      const now = new Date();
      orderData.forEach((o: any) => {
        byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
        if (o.deliveryDate && new Date(o.deliveryDate) < now && !["DELIVERED","ORDER_CLOSED"].includes(o.status)) overdue.push(o);
      });
      ctx += `\n## Order Status Breakdown\n`;
      Object.entries(byStatus).forEach(([s, c]) => { ctx += `- ${s}: ${c}\n`; });
      ctx += `\n## Recent Orders (last 50)\n`;
      orderData.slice(0, 30).forEach((o: any) => {
        ctx += `- ${o.orderNumber} | ${o.customer?.name ?? "?"} | ${o.garmentType} | ${o.status} | Delivery: ${o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString("en-AE") : "N/A"} | AED ${o.totalAmount}\n`;
      });
      if (overdue.length > 0) {
        ctx += `\n## Overdue Orders (${overdue.length})\n`;
        overdue.forEach((o: any) => {
          ctx += `- ${o.orderNumber} | ${o.customer?.name ?? "?"} | Due: ${new Date(o.deliveryDate).toLocaleDateString("en-AE")} | Status: ${o.status}\n`;
        });
      }
    }
  }

  // Customers
  if (intent.customers || wantsAll) {
    const custData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (custData.length > 0) {
      ctx += `\n## Customer List (recent ${custData.length})\n`;
      custData.forEach((c: any) => {
        ctx += `- ${c.name} | ${c.phone ?? "no phone"} | ${c.email ?? "no email"}\n`;
      });
    }
  }

  // Leads
  if (intent.leads || wantsAll) {
    const leadsData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (leadsData.length > 0) {
      ctx += `\n## Leads (recent ${leadsData.length})\n`;
      leadsData.forEach((l: any) => {
        ctx += `- ${l.name} | ${l.phone ?? "?"} | Status: ${l.status} | Source: ${l.source ?? "?"} | Garment: ${l.garmentType ?? "?"}\n`;
      });
    }
    const fuData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (fuData.length > 0) {
      ctx += `\n## Pending Follow-ups\n`;
      fuData.forEach((f: any) => {
        ctx += `- ${f.lead?.name ?? "?"} | Due: ${f.dueDate ? new Date(f.dueDate).toLocaleDateString("en-AE") : "N/A"} | ${f.notes ?? ""}\n`;
      });
    }
  }

  // Appointments
  if (intent.appointments || wantsAll) {
    const apptData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (apptData.length > 0) {
      ctx += `\n## Upcoming Appointments\n`;
      apptData.forEach((a: any) => {
        ctx += `- ${a.title ?? "Appointment"} | ${a.customer?.name ?? "?"} | ${a.date ? new Date(a.date).toLocaleDateString("en-AE") : "?"} | ${a.status}\n`;
      });
    }
  }

  // Fabrics
  if (intent.fabrics || wantsAll) {
    const fabricData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (fabricData.length > 0) {
      ctx += `\n## Fabric Inventory\n`;
      fabricData.forEach((f: any) => {
        ctx += `- ${f.name} | ${f.color ?? "?"} | Qty: ${f.quantity} ${f.unit ?? ""} | AED ${f.price ?? "?"}\n`;
      });
    }
  }

  // Staff
  if (intent.staff || wantsAll) {
    const staffData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (staffData.length > 0) {
      ctx += `\n## Team Members\n`;
      staffData.forEach((s: any) => {
        ctx += `- ${s.name} | ${s.role} | ${s.position ?? "No position"}\n`;
      });
    }
  }

  // Finance
  if (intent.finance || wantsAll) {
    const purchaseData = (results[idx++] as PromiseFulfilledResult<any>)?.value?.data ?? [];
    if (purchaseData.length > 0) {
      ctx += `\n## Recent Purchases/Expenses\n`;
      purchaseData.forEach((p: any) => {
        ctx += `- ${p.description ?? "?"} | ${p.category ?? "?"} | AED ${p.amount} | ${p.date ? new Date(p.date).toLocaleDateString("en-AE") : "?"}\n`;
      });
    }
  }

  ctx += `
## Instructions
Answer the user's question using the real data above. Be concise and specific.
If the user asks about a specific customer, order number, or name — search the data above and give exact results.
If something is not in the data, say so clearly. Format key numbers and names in bold.`;

  return ctx;
}

// ── smart mock response using real fetched data (no OpenAI key) ───────────────
function buildMockResponse(question: string, context: string): string {
  const q = question.toLowerCase();
  const lines = context.split("\n");

  const extract = (section: string) =>
    lines.filter((l) => l.startsWith("- ") && context.indexOf(section) < context.indexOf(l)).slice(0, 10);

  // Revenue / finance
  if (detect(q, KW.revenue) || detect(q, KW.finance)) {
    const revLine = lines.find((l) => l.includes("Revenue Collected"));
    const outLine = lines.find((l) => l.includes("Outstanding"));
    return [
      "**Revenue Summary**",
      "",
      revLine ? `💰 ${revLine.replace("- ", "").trim()}` : "",
      outLine ? `📋 ${outLine.replace("- ", "").trim()}` : "",
      "",
      "**Recommendations:**",
      "- Chase outstanding balances — prioritize invoices over 30 days",
      "- Increase advance collection to ≥50% on new orders",
      "- Premium garments (suits, sherwanis) yield 40-60% higher margins",
    ].filter(Boolean).join("\n");
  }

  // Order status or specific status keyword
  if (detect(q, KW.orders) || detect(q, KW.status)) {
    const statusSection = lines.filter((l) => l.startsWith("- ") && context.includes("Order Status Breakdown") &&
      context.indexOf("Order Status Breakdown") < context.indexOf(l) &&
      context.indexOf(l) < context.indexOf("Recent Orders"));
    const overdueSection = lines.filter((l) => l.startsWith("- ") && context.includes("Overdue Orders") &&
      context.indexOf("Overdue Orders") < context.indexOf(l));
    return [
      "**Order Analytics**",
      "",
      statusSection.length ? "**Status Breakdown:**\n" + statusSection.join("\n") : "",
      overdueSection.length ? `\n**⚠️ Overdue Orders:**\n${overdueSection.slice(0, 5).join("\n")}` : "",
      "",
      "**Recommendations:**",
      "- Clear TRIAL status orders within 48 hours",
      "- Assign urgent orders to your fastest tailors",
    ].filter(Boolean).join("\n");
  }

  // Customers
  if (detect(q, KW.customers)) {
    const custSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("Customer List") &&
      context.indexOf("Customer List") < context.indexOf(l)
    ).slice(0, 8);
    const totalLine = lines.find((l) => l.includes("Total Customers"));
    return [
      "**Customer Overview**",
      "",
      totalLine?.trim() ?? "",
      "",
      custSection.length ? "**Recent Customers:**\n" + custSection.join("\n") : "",
      "",
      "**Retention Tips:**",
      "- Follow up within 7 days after delivery",
      "- Offer seasonal promotions during wedding and Eid season",
    ].filter(Boolean).join("\n");
  }

  // Leads / follow-ups
  if (detect(q, KW.leads) || detect(q, KW.followups)) {
    const leadsSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("## Leads") &&
      context.indexOf("## Leads") < context.indexOf(l) &&
      (context.indexOf("## Pending Follow-ups") === -1 || context.indexOf(l) < context.indexOf("## Pending Follow-ups"))
    ).slice(0, 8);
    const fuSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("Pending Follow-ups") &&
      context.indexOf("Pending Follow-ups") < context.indexOf(l)
    ).slice(0, 5);
    return [
      "**Lead & Follow-up Report**",
      "",
      leadsSection.length ? "**Active Leads:**\n" + leadsSection.join("\n") : "No leads found in data.",
      fuSection.length ? "\n**Pending Follow-ups:**\n" + fuSection.join("\n") : "",
      "",
      "**Tips:**",
      "- Follow up within 24 hours of initial inquiry — conversion drops 80% after 48h",
      "- Track source to identify your best lead channels",
    ].filter(Boolean).join("\n");
  }

  // Appointments
  if (detect(q, KW.appointments)) {
    const apptSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("Appointments") &&
      context.indexOf("Appointments") < context.indexOf(l)
    ).slice(0, 8);
    return [
      "**Appointments**",
      "",
      apptSection.length ? apptSection.join("\n") : "No upcoming appointments found.",
    ].filter(Boolean).join("\n");
  }

  // Fabrics
  if (detect(q, KW.fabrics)) {
    const fabricSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("Fabric Inventory") &&
      context.indexOf("Fabric Inventory") < context.indexOf(l)
    ).slice(0, 10);
    return [
      "**Fabric Inventory**",
      "",
      fabricSection.length ? fabricSection.join("\n") : "No fabric data found.",
    ].filter(Boolean).join("\n");
  }

  // Staff
  if (detect(q, KW.staff)) {
    const staffSection = lines.filter((l) =>
      l.startsWith("- ") && context.includes("Team Members") &&
      context.indexOf("Team Members") < context.indexOf(l)
    ).slice(0, 10);
    return [
      "**Team Overview**",
      "",
      staffSection.length ? staffSection.join("\n") : "No staff data found.",
    ].filter(Boolean).join("\n");
  }

  // Generic: look for any name/number in the question matching context data
  const matchedLines = lines.filter((l) =>
    l.startsWith("- ") && q.split(/\s+/).some((word) => word.length > 3 && l.toLowerCase().includes(word))
  ).slice(0, 10);

  if (matchedLines.length > 0) {
    return [
      `**Search Results for "${question}"**`,
      "",
      matchedLines.join("\n"),
    ].join("\n");
  }

  // Full summary fallback
  const revLine = lines.find((l) => l.includes("Revenue Collected"))?.replace("- ", "") ?? "";
  const outLine = lines.find((l) => l.includes("Outstanding"))?.replace("- ", "") ?? "";
  const ordersLine = lines.find((l) => l.includes("Total Orders"))?.replace("- ", "") ?? "";
  const custLine = lines.find((l) => l.includes("Total Customers"))?.replace("- ", "") ?? "";
  const pendingLine = lines.find((l) => l.includes("Active/Pending"))?.replace("- ", "") ?? "";

  return [
    "**Business Overview — House of Tailors**",
    "",
    `📦 ${ordersLine}`,
    `👥 ${custLine}`,
    `🔄 ${pendingLine}`,
    revLine ? `💰 ${revLine}` : "",
    outLine ? `📋 ${outLine}` : "",
    "",
    "**Ask me about:**",
    "- Customer names, order numbers, delivery status",
    "- Revenue, outstanding balances, invoices",
    "- Leads, follow-ups, appointments",
    "- Fabric inventory, staff, purchases",
  ].filter(Boolean).join("\n");
}

// ── route handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const body = await request.json();
  const messages: { role: string; content: string }[] = (body.messages ?? []).slice(-20);
  const latestQuestion = messages[messages.length - 1]?.content ?? "";

  const context = await buildContext(latestQuestion.toLowerCase());

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const mockResponse = buildMockResponse(latestQuestion, context);
    return NextResponse.json({ choices: [{ message: { content: mockResponse } }] });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [{ role: "system", content: context }, ...messages],
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({
      choices: [{ message: { content: buildMockResponse(latestQuestion, context) } }],
    });
  }
}
