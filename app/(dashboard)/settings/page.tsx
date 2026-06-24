export const dynamic = "force-dynamic";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getTeamMembers } from "@/actions/users";
import { getBusinessSettings } from "@/actions/business-settings";
import { getFabricHistory } from "@/actions/fabric-history";
import { getBranches } from "@/actions/branches";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = ADMIN_ROLES.includes(session.user.role);

  const [teamResult, businessSettings, fabricHistory, branches] = await Promise.all([
    isAdmin ? getTeamMembers() : Promise.resolve(null),
    getBusinessSettings(),
    getFabricHistory(),
    isAdmin ? getBranches() : Promise.resolve([]),
  ]);

  return (
    <SettingsClient
      user={session.user}
      teamMembers={teamResult?.success ? teamResult.data : []}
      businessSettings={businessSettings}
      fabricHistory={fabricHistory}
      branches={branches}
    />
  );
}
