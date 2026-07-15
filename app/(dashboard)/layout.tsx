import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { hasPageAccess } from "@/lib/permissions";
import { getBranches } from "@/actions/branches";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { getProductionBadgeCounts } from "@/actions/production-orders";
import { DashboardLayoutClient } from "./dashboard-layout-client";
import Link from "next/link";
import { Lock } from "lucide-react";

// Pages that are always accessible regardless of permissions
const ALWAYS_ALLOWED = new Set(["settings", "notifications", "scan"]);

function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-5">
      <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-[#D4AF37]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don&apos;t have permission to view this page. Contact your administrator to request access.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/25 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch fresh permissions from DB so changes take effect immediately
  const { data: dbUser } = await supabase
    .from("User")
    .select("pagePermissions")
    .eq("id", session.user.id)
    .maybeSingle();

  const pagePermissions: string[] | null = (dbUser as any)?.pagePermissions ?? null;

  // Determine current page key from the injected header
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const pageKey = pathname.split("/")[1] ?? "dashboard";

  const isRestricted =
    !ALWAYS_ALLOWED.has(pageKey) &&
    !hasPageAccess(pageKey, pagePermissions, session.user.role);

  const hasProductionAccess = hasPageAccess("production", pagePermissions, session.user.role);
  const [branches, activeBranchId, productionBadges] = await Promise.all([
    getBranches(),
    getActiveBranchCookie(),
    hasProductionAccess ? getProductionBadgeCounts() : Promise.resolve(null),
  ]);

  return (
    <DashboardLayoutClient
      user={session.user}
      pagePermissions={pagePermissions}
      branches={branches}
      activeBranchId={activeBranchId}
      productionBadges={productionBadges}
    >
      {isRestricted ? <AccessDeniedPage /> : children}
    </DashboardLayoutClient>
  );
}
