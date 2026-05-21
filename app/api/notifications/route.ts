export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: notifications } = await supabase
    .from("Notification")
    .select("*")
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  return NextResponse.json({ notifications: notifications ?? [] });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();

  if (id === "all") {
    await supabase
      .from("Notification")
      .update({ isRead: true })
      .eq("userId", session.user.id)
      .eq("isRead", false);
  } else {
    await supabase.from("Notification").update({ isRead: true }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
