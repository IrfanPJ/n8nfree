export const dynamic = "force-dynamic";

import { getProductionOverviewStats, getProductionOverviewOrders } from "@/actions/production-orders";
import { OverviewContent } from "@/components/production/overview-content";

export default async function ProductionOverviewPage() {
  const [stats, orders] = await Promise.all([
    getProductionOverviewStats(),
    getProductionOverviewOrders(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Production Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time status across the workshop.</p>
      </div>
      <OverviewContent stats={stats} orders={orders} />
    </div>
  );
}
