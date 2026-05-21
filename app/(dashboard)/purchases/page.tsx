export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getPurchases, getPurchaseStats, getSuppliers } from "@/actions/purchases";
import { PurchasesClient } from "./purchases-client";
import { Skeleton } from "@/components/ui/skeleton";

async function PurchasesContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  const params = await searchParams;
  const [result, stats, suppliers] = await Promise.all([
    getPurchases({ page: parseInt(params.page ?? "1"), search: params.search, category: params.category }),
    getPurchaseStats(),
    getSuppliers(),
  ]);

  return <PurchasesClient initialData={result} stats={stats} suppliers={suppliers} />;
}

export default function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}) {
  return (
    <Suspense fallback={<div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}>
      <PurchasesContent searchParams={searchParams} />
    </Suspense>
  );
}
