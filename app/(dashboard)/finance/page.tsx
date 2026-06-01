export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { getFinanceStats, getMonthlyFinance, getTopClientsByRevenue } from "@/actions/finance";
import { getPOSSales } from "@/actions/pos";
import { FinanceClient } from "./finance-client";
import { Skeleton } from "@/components/ui/skeleton";

async function FinanceContent() {
  const [stats, monthly, topClients, posSales] = await Promise.all([
    getFinanceStats(),
    getMonthlyFinance(),
    getTopClientsByRevenue(),
    getPOSSales(),
  ]);
  return <FinanceClient stats={stats} monthly={monthly} topClients={topClients} posSales={posSales} />;
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinanceContent />
    </Suspense>
  );
}
