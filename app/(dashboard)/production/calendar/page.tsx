export const dynamic = "force-dynamic";

import { getProductionCalendarData } from "@/actions/production-orders";
import { CalendarClient } from "./calendar-client";

export default async function ProductionCalendarPage() {
  const data = await getProductionCalendarData();
  return <CalendarClient data={data} />;
}
