export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getCustomers } from "@/actions/customers";
import { CustomersClient } from "./customers-client";
import { Skeleton } from "@/components/ui/skeleton";

async function CustomersContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; vip?: string; gender?: string; branch?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const search = params.search;
  const isVIP = params.vip === "true" ? true : undefined;
  const gender = params.gender;
  const branch = params.branch;

  const result = await getCustomers({ page, search, isVIP, gender, branch });
  return <CustomersClient initialData={result} />;
}

export default function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; vip?: string; gender?: string; branch?: string }>;
}) {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    </div>
  );
}
