export const dynamic = "force-dynamic";

import { getProductionSuggestions } from "@/actions/production-orders";
import { getProductionTailors } from "@/actions/production-tailors";
import { SuggestionsClient } from "./suggestions-client";

export default async function ProductionSuggestionsPage() {
  const [{ capacity, recommendations }, tailors] = await Promise.all([
    getProductionSuggestions(),
    getProductionTailors(false),
  ]);

  return <SuggestionsClient capacity={capacity} recommendations={recommendations} tailors={tailors} />;
}
