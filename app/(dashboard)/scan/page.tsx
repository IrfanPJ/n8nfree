export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ScanClient } from "./scan-client";

export default async function ScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data: dbUser } = await supabase
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  return (
    <ScanClient
      userPosition={(dbUser as any)?.position ?? null}
      userName={(dbUser as any)?.name ?? session.user.email ?? ""}
      userRole={session.user.role}
    />
  );
}
