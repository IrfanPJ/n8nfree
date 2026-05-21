export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getInvoices } from "@/actions/invoices";
import { getCustomers } from "@/actions/customers";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { InvoicesClient } from "./invoices-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceStatus } from "@/types";

async function InvoicesContent({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  }>;
}) {
  const params = await searchParams;
  await auth();

  const page = parseInt(params.page ?? "1", 10);

  const [invoicesResult, customersResult, { data: orders }] = await Promise.all([
    getInvoices({
      page,
      pageSize: 20,
      status: params.status as InvoiceStatus | undefined,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      customerId: params.customerId,
    }),
    getCustomers({ pageSize: 500 }),
    supabase
      .from("Order")
      .select("id, orderNumber, customerId, status, totalAmount")
      .eq("isActive", true)
      .order("createdAt", { ascending: false })
      .limit(200),
  ]);

  return (
    <InvoicesClient
      initialData={invoicesResult}
      customers={customersResult.data}
      orders={(orders ?? []) as Parameters<typeof InvoicesClient>[0]["orders"]}
    />
  );
}

export default function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  }>;
}) {
  return (
    <Suspense fallback={<InvoicesSkeleton />}>
      <InvoicesContent searchParams={searchParams} />
    </Suspense>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-72" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
