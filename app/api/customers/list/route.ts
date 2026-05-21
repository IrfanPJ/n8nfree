export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  return NextResponse.json({ customers });
}
