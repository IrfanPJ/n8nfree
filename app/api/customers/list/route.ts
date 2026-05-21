export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customers } = await supabase
    .from("Customer")
    .select("id, name, phone, email")
    .eq("isActive", true)
    .order("name", { ascending: true })
    .limit(500);

  return NextResponse.json({ customers: customers ?? [] });
}
