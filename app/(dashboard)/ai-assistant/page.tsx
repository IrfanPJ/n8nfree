import React from "react";
import { auth } from "@/lib/auth";
import { AIAssistantClient } from "./ai-assistant-client";

export default async function AIAssistantPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "guest";
  return <AIAssistantClient userId={userId} />;
}
