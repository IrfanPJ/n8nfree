export const dynamic = "force-dynamic";

import { getProductionOverviewOrders } from "@/actions/production-orders";
import { getProductionTailors } from "@/actions/production-tailors";
import { getProductionPriceListItems, getUnmatchedProductionItems } from "@/actions/production-price-list";
import { SheetViewClient } from "./sheet-view-client";

export default async function ProductionSheetViewPage() {
  const [orders, tailors, priceListItems, unmatchedItems] = await Promise.all([
    getProductionOverviewOrders(),
    getProductionTailors(true),
    getProductionPriceListItems(),
    getUnmatchedProductionItems(),
  ]);

  return (
    <SheetViewClient
      orders={orders}
      tailors={tailors}
      priceListItems={priceListItems}
      unmatchedItems={unmatchedItems}
    />
  );
}
