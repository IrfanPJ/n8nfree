"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImportUploadButton } from "@/components/production/import-upload-button";
import { UnmatchedItemsPanel } from "@/components/production/unmatched-items-panel";
import { OrdersGrid } from "./orders-grid";
import { TailorsGrid } from "./tailors-grid";
import { PriceListGrid } from "./price-list-grid";
import type { ProductionOrderWithRelations, ProductionTailor, ProductionPriceListItem } from "@/types/production";

export function SheetViewClient({
  orders,
  tailors,
  priceListItems,
  unmatchedItems,
}: {
  orders: ProductionOrderWithRelations[];
  tailors: ProductionTailor[];
  priceListItems: ProductionPriceListItem[];
  unmatchedItems: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Sheet View</h1>
          <p className="text-sm text-muted-foreground">Edit cells directly, spreadsheet-style — changes save on blur.</p>
        </div>
        <ImportUploadButton />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="tailors">Tailors ({tailors.length})</TabsTrigger>
          <TabsTrigger value="price-list">Price List ({priceListItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersGrid orders={orders} tailors={tailors} priceListItems={priceListItems} /></TabsContent>
        <TabsContent value="tailors"><TailorsGrid tailors={tailors} /></TabsContent>
        <TabsContent value="price-list" className="space-y-4">
          <UnmatchedItemsPanel unmatchedItems={unmatchedItems} priceListItems={priceListItems} />
          <PriceListGrid priceListItems={priceListItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
