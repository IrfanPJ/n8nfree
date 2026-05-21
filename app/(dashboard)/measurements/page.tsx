export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getMeasurements } from "@/actions/measurements";
import { getCustomers } from "@/actions/customers";
import { MeasurementsClient } from "./measurements-client";
import { Skeleton } from "@/components/ui/skeleton";

async function MeasurementsContent({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const params = await searchParams;

  const [measurements, customersResult] = await Promise.all([
    getMeasurements(params.customerId),
    getCustomers({ pageSize: 500 }),
  ]);

  return (
    <MeasurementsClient
      measurements={measurements}
      customers={customersResult.data}
    />
  );
}

export default function MeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  return (
    <Suspense fallback={<MeasurementsSkeleton />}>
      <MeasurementsContent searchParams={searchParams} />
    </Suspense>
  );
}

function MeasurementsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
