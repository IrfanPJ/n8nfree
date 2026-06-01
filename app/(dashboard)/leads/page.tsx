export const dynamic = "force-dynamic";
import React, { Suspense } from "react";
import { getLeads } from "@/actions/leads";
import { LeadsClient } from "./leads-client";
import { Skeleton } from "@/components/ui/skeleton";

async function LeadsContent() {
  const leads = await getLeads();
  return <LeadsClient initialLeads={leads} />;
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
