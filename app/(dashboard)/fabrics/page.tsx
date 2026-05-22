export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getFabrics } from "@/actions/fabrics";
import { FabricsClient } from "./fabrics-client";
import { Skeleton } from "@/components/ui/skeleton";

async function FabricsContent({ searchParams }: { searchParams: Promise<{ search?: string; lowStock?: string; branch?: string }> }) {
  const params = await searchParams;
  const fabrics = await getFabrics({
    search: params.search,
    lowStockOnly: params.lowStock === "1",
    branch: params.branch,
  });
  return <FabricsClient initialFabrics={fabrics} />;
}

export default function FabricsPage({ searchParams }: { searchParams: Promise<{ search?: string; lowStock?: string; branch?: string }> }) {
  return (
    <Suspense fallback={<div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>}>
      <FabricsContent searchParams={searchParams} />
    </Suspense>
  );
}
