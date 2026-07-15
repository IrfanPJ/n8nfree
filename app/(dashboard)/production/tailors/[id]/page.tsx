export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProductionTailorById } from "@/actions/production-tailors";
import { getProductionOverviewStats, getProductionOverviewOrders } from "@/actions/production-orders";
import { OverviewContent } from "@/components/production/overview-content";

export default async function ProductionTailorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tailor = await getProductionTailorById(id);
  if (!tailor) notFound();

  const [stats, orders] = await Promise.all([
    getProductionOverviewStats(id),
    getProductionOverviewOrders(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{tailor.name}</h1>
        <p className="text-sm text-muted-foreground">{tailor.jobTitles.join(", ")}</p>
      </div>
      <OverviewContent stats={stats} orders={orders} tailor={tailor} />
    </div>
  );
}
