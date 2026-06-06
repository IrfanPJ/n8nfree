export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { SearchResult } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // Run customers first so their IDs can be used to find linked orders/invoices/appointments by name
  const { data: customers } = await supabase
    .from("Customer")
    .select("id, name, phone, email")
    .eq("isActive", true)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(5);

  const customerIds = (customers ?? []).map((c: any) => c.id);
  const byCustomer = customerIds.length > 0 ? `,customerId.in.(${customerIds.join(",")})` : "";

  const [{ data: orders }, { data: invoices }, { data: appointments }, { data: leads }] =
    await Promise.all([
      supabase
        .from("Order")
        .select(`id, orderNumber, garmentType, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .or(`orderNumber.ilike.%${q}%,garmentType.ilike.%${q}%${byCustomer}`)
        .limit(5),
      supabase
        .from("Invoice")
        .select(`id, invoiceNumber, totalAmount, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .or(`invoiceNumber.ilike.%${q}%${byCustomer}`)
        .limit(5),
      supabase
        .from("Appointment")
        .select(`id, title, startTime, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .or(`title.ilike.%${q}%${byCustomer}`)
        .limit(5),
      supabase
        .from("Lead")
        .select("id, name, phone, email, stage")
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5),
    ]);

  const results: SearchResult[] = [
    ...(customers ?? []).map((c: any) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: c.phone + (c.email ? ` · ${c.email}` : ""),
      href: `/customers/${c.id}`,
    })),
    ...(orders ?? []).map((o: any) => ({
      type: "order" as const,
      id: o.id,
      title: o.orderNumber,
      subtitle: `${o.garmentType} · ${o.customer?.name ?? ""}`,
      href: `/orders/${o.id}`,
    })),
    ...(invoices ?? []).map((i: any) => ({
      type: "invoice" as const,
      id: i.id,
      title: i.invoiceNumber,
      subtitle: `${i.customer?.name ?? ""} · AED ${i.totalAmount}`,
      href: `/invoices/${i.id}`,
    })),
    ...(appointments ?? []).map((a: any) => ({
      type: "appointment" as const,
      id: a.id,
      title: a.title,
      subtitle: `${a.customer?.name ?? ""} · ${new Date(a.startTime).toLocaleDateString()}`,
      href: `/appointments/${a.id}`,
    })),
    ...(leads ?? []).map((l: any) => ({
      type: "lead" as const,
      id: l.id,
      title: l.name,
      subtitle: [l.phone, l.email, l.stage?.replace(/_/g, " ")].filter(Boolean).join(" · "),
      href: `/leads`,
    })),
  ];

  return NextResponse.json({ results });
}
