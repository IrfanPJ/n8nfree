export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getFollowUps } from "@/actions/followups";
import { FollowUpsClient } from "./followups-client";
import { Skeleton } from "@/components/ui/skeleton";

async function FollowUpsContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const result = await getFollowUps({
    page: parseInt(params.page ?? "1"),
    search: params.search,
    status: params.status,
    priority: params.priority,
  });
  return <FollowUpsClient initialData={result} />;
}

export default function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; priority?: string }>;
}) {
  return (
    <Suspense fallback={<div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}>
      <FollowUpsContent searchParams={searchParams} />
    </Suspense>
  );
}
