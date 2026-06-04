export const dynamic = "force-dynamic";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getTeamMembers } from "@/actions/users";
import { getBusinessSettings } from "@/actions/business-settings";
import { getFabricHistory } from "@/actions/fabric-history";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [teamResult, businessSettings, fabricHistory] = await Promise.all([
    session.user.role === "ADMIN" ? getTeamMembers() : Promise.resolve(null),
    getBusinessSettings(),
    getFabricHistory(),
  ]);

  return (
    <SettingsClient
      user={session.user}
      teamMembers={teamResult?.success ? teamResult.data : []}
      businessSettings={businessSettings}
      fabricHistory={fabricHistory}
    />
  );
}
