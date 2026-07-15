export const dynamic = "force-dynamic";

import { getTailorPerformances } from "@/actions/production-tailors";
import { PerformanceClient } from "./performance-client";

export default async function ProductionPerformancePage() {
  const performances = await getTailorPerformances();
  return <PerformanceClient performances={performances} />;
}
