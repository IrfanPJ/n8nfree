export const dynamic = "force-dynamic";

import { getProductionPayReport } from "@/actions/production-orders";
import { getProductionTailors } from "@/actions/production-tailors";
import { PayReportClient } from "./pay-report-client";

export default async function ProductionReportsPage() {
  const [initialReport, tailors] = await Promise.all([
    getProductionPayReport({}),
    getProductionTailors(true),
  ]);

  return <PayReportClient initialReport={initialReport} tailors={tailors} />;
}
