export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getLeads, syncClosedWonLeads } from "@/actions/leads";
import { getCustomers } from "@/actions/customers";
import { LeadsClient } from "./leads-client";
import { Skeleton } from "@/components/ui/skeleton";

async function LeadsContent() {
  const [leads, customersResult] = await Promise.all([
    getLeads(),
    getCustomers({ pageSize: 500 }),
    syncClosedWonLeads(),
  ]);
  return <LeadsClient initialLeads={leads} customers={customersResult.data} />;
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-[500px] w-64 rounded-xl flex-shrink-0" />
          ))}
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
