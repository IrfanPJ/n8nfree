export const dynamic = "force-dynamic";

import { getProductionOrders } from "@/actions/production-orders";
import { getProductionTailors } from "@/actions/production-tailors";
import { DispatchedClient } from "./dispatched-client";

export default async function DispatchedDeliveredPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; tailorId?: string }>;
}) {
  const params = await searchParams;
  const [result, tailors] = await Promise.all([
    getProductionOrders({
      statusIn: ["DISPATCHED", "DELIVERED"],
      store: params.store,
      tailorId: params.tailorId,
      pageSize: 500,
      sortBy: "deliveryDate",
      sortDir: "desc",
    }),
    getProductionTailors(true),
  ]);

  return (
    <DispatchedClient
      orders={result.data}
      tailors={tailors}
      initialFilters={{ store: params.store ?? "ALL", tailorId: params.tailorId ?? "ALL" }}
    />
  );
}
