export const dynamic = "force-dynamic";

import { getProductionOrders } from "@/actions/production-orders";
import { getProductionTailors } from "@/actions/production-tailors";
import { getProductionPriceListItems } from "@/actions/production-price-list";
import { AllOrdersClient } from "./all-orders-client";

export default async function ProductionAllOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; search?: string; status?: string; store?: string; tailorId?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const [result, tailors, priceListItems] = await Promise.all([
    getProductionOrders({
      page, pageSize: 25, search: params.search, status: params.status, store: params.store, tailorId: params.tailorId,
    }),
    getProductionTailors(true),
    getProductionPriceListItems(),
  ]);

  return (
    <AllOrdersClient
      initialData={result}
      tailors={tailors}
      priceListItems={priceListItems}
      initialFilters={{
        search: params.search ?? "", status: params.status ?? "ALL", store: params.store ?? "ALL", tailorId: params.tailorId ?? "ALL",
      }}
    />
  );
}
