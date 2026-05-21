export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SearchResult } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [customers, orders, invoices, appointments] = await Promise.all([
    prisma.customer.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.order.findMany({
      where: {
        isActive: true,
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { garmentType: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      select: { id: true, orderNumber: true, garmentType: true, customer: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: {
        isActive: true,
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      select: { id: true, invoiceNumber: true, totalAmount: true, customer: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      select: { id: true, title: true, startTime: true, customer: { select: { name: true } } },
    }),
  ]);

  const results: SearchResult[] = [
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: c.phone + (c.email ? ` · ${c.email}` : ""),
      href: `/customers/${c.id}`,
    })),
    ...orders.map((o) => ({
      type: "order" as const,
      id: o.id,
      title: o.orderNumber,
      subtitle: `${o.garmentType} · ${o.customer.name}`,
      href: `/orders/${o.id}`,
    })),
    ...invoices.map((i) => ({
      type: "invoice" as const,
      id: i.id,
      title: i.invoiceNumber,
      subtitle: `${i.customer.name} · ₹${i.totalAmount}`,
      href: `/invoices/${i.id}`,
    })),
    ...appointments.map((a) => ({
      type: "appointment" as const,
      id: a.id,
      title: a.title,
      subtitle: `${a.customer.name} · ${new Date(a.startTime).toLocaleDateString()}`,
      href: `/appointments/${a.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
