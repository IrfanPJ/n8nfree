export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getOrders } from "@/actions/orders";
import { OrdersClient } from "./orders-client";
import { Skeleton } from "@/components/ui/skeleton";

async function OrdersContent({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
    view?: string;
    branch?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const search = params.search;
  const status = params.status;
  const priority = params.priority;
  const branch = params.branch;

  const result = await getOrders({ page, search, status, priority, branch, pageSize: 20 });
  return (
    <OrdersClient
      initialData={result}
      initialView={(params.view as "table" | "kanban") ?? "table"}
    />
  );
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    priority?: string;
    view?: string;
    branch?: string;
  }>;
}) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-9 w-20 ml-auto" />
      </div>

      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
