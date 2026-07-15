export const dynamic = "force-dynamic";

import { getTailorWorkloads } from "@/actions/production-tailors";
import { TailorsClient } from "./tailors-client";

export default async function ProductionTailorsPage() {
  const workloads = await getTailorWorkloads();
  return <TailorsClient workloads={workloads} />;
}
