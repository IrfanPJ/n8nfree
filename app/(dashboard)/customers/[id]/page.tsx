export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/actions/customers";
import { CustomerDetailClient } from "./customer-detail-client";
import { Skeleton } from "@/components/ui/skeleton";

async function CustomerDetailContent({ id }: { id: string }) {
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  return <CustomerDetailClient customer={customer} />;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>}>
      <AsyncCustomerDetailPage params={params} />
    </Suspense>
  );
}

async function AsyncCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailContent id={id} />;
}
