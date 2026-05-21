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

  const [{ data: customers }, { data: orders }, { data: invoices }, { data: appointments }] =
    await Promise.all([
      supabase
        .from("Customer")
        .select("id, name, phone, email")
        .eq("isActive", true)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("Order")
        .select(`id, orderNumber, garmentType, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .or(`orderNumber.ilike.%${q}%,garmentType.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("Invoice")
        .select(`id, invoiceNumber, totalAmount, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .ilike("invoiceNumber", `%${q}%`)
        .limit(5),
      supabase
        .from("Appointment")
        .select(`id, title, startTime, customer:Customer!customerId(name)`)
        .eq("isActive", true)
        .ilike("title", `%${q}%`)
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
  ];

  return NextResponse.json({ results });
}
