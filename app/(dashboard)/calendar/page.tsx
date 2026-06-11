export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getCalendarEvents } from "@/actions/calendar";
import { CalendarClient } from "./calendar-client";
import { Skeleton } from "@/components/ui/skeleton";

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const params = await searchParams;
  const branch = params.branch;

  // Default to current month
  const now = new Date();
  const dateFrom = params.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dateTo = params.dateTo ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const events = await getCalendarEvents({ dateFrom, dateTo, branch });

  return <CalendarClient initialEvents={events} branch={branch} />;
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; dateFrom?: string; dateTo?: string }>;
}) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-[600px] rounded-xl" />
    </div>
  );
}
