export const dynamic = "force-dynamic";
import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivityLogs, getActivityUsers } from "@/actions/activity";
import { ActivityClient } from "./activity-client";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const userId = sp.userId ?? "";
  const entity = sp.entity ?? "";
  const action = sp.action ?? "";
  const search = sp.search ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo = sp.dateTo ?? "";

  const [logs, users] = await Promise.all([
    getActivityLogs({ page, pageSize: 50, userId: userId || undefined, entity: entity || undefined, action: action || undefined, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    getActivityUsers(),
  ]);

  return (
    <ActivityClient
      initialData={logs}
      users={users}
      currentUserId={session.user.id}
      currentRole={session.user.role}
    />
  );
}
