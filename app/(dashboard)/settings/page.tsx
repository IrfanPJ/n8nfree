export const dynamic = "force-dynamic";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getTeamMembers } from "@/actions/users";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teamResult =
    session.user.role === "ADMIN" ? await getTeamMembers() : null;

  return (
    <SettingsClient
      user={session.user}
      teamMembers={teamResult?.success ? teamResult.data : []}
    />
  );
}
