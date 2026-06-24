export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboard } from "./views/admin-dashboard";
import { SalesDashboard } from "./views/sales-dashboard";
import { ProductionDashboard } from "./views/production-dashboard";
import { LogisticsDashboard } from "./views/logistics-dashboard";
import { PurchaseDashboard } from "./views/purchase-dashboard";

const PRODUCTION_POSITIONS = new Set(["TAILOR", "MASTER", "PRODUCTION_IN_CHARGE", "QUALITY_CHECK"]);
const SALES_POSITIONS = new Set(["SALES_STAFF", "LEAD_MANAGEMENT_STAFF"]);

async function DashboardContent() {
  const session = await auth();
  if (!session?.user) return null;

  const { data: dbUser } = await supabase
    .from("User")
    .select("position, name")
    .eq("id", session.user.id)
    .maybeSingle();

  const position: string | null = (dbUser as any)?.position ?? null;
  const role = session.user.role;
  const userId = session.user.id;
  const userName = (dbUser as any)?.name ?? session.user.name ?? session.user.email ?? "Team";

  // Super Admin, Admin & Manager → full business overview
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") {
    return <AdminDashboard userId={userId} userName={userName} />;
  }

  // Sales / Lead management
  if (position && SALES_POSITIONS.has(position)) {
    return <SalesDashboard userId={userId} userName={userName} position={position} />;
  }

  // Production (tailor, master, QC, production in charge)
  if (position && PRODUCTION_POSITIONS.has(position)) {
    return <ProductionDashboard userId={userId} userName={userName} position={position} />;
  }

  // Logistics
  if (position === "LOGISTICS_COORDINATOR") {
    return <LogisticsDashboard userId={userId} userName={userName} />;
  }

  // Purchase / inventory
  if (position === "PURCHASE_STAFF") {
    return <PurchaseDashboard userId={userId} userName={userName} />;
  }

  // STAFF with no position → simplified admin-lite view
  return <AdminDashboard userId={userId} userName={userName} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
