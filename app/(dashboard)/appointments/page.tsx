export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getAppointments } from "@/actions/appointments";
import { getCustomers } from "@/actions/customers";
import { getAssignableStaff } from "@/actions/users";
import { auth } from "@/lib/auth";
import { AppointmentsClient } from "./appointments-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppointmentStatus } from "@/types";

async function AppointmentsContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  }>;
}) {
  const params = await searchParams;
  await auth();

  const [appointments, customersResult, staffResult] = await Promise.all([
    getAppointments({
      status: params.status as AppointmentStatus | undefined,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      customerId: params.customerId,
    }),
    getCustomers({ pageSize: 500 }),
    getAssignableStaff(),
  ]);
  const staffUsers = staffResult.success ? staffResult.data : [];

  return (
    <AppointmentsClient
      appointments={appointments}
      customers={customersResult.data}
      staff={(staffUsers ?? []) as Parameters<typeof AppointmentsClient>[0]["staff"]}
    />
  );
}

export default function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  }>;
}) {
  return (
    <Suspense fallback={<AppointmentsSkeleton />}>
      <AppointmentsContent searchParams={searchParams} />
    </Suspense>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
