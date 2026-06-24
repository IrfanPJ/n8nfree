export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getScopedClient(session);

  const { data: customers } = await db
    .from("Customer")
    .select("id, name, phone, email")
    .eq("isActive", true)
    .order("name", { ascending: true })
    .limit(500);

  return NextResponse.json({ customers: customers ?? [] });
}
