"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import type { PaginatedResult } from "@/types";

export type ActivityLogEntry = {
  id: string;
  userId: string | null;
  customerId: string | null;
  orderId: string | null;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
  customer: { id: string; name: string } | null;
};

export type GetActivityLogsParams = {
  page?: number;
  pageSize?: number;
  userId?: string;
  entity?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getActivityLogs(
  params: GetActivityLogsParams = {}
): Promise<PaginatedResult<ActivityLogEntry>> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { page = 1, pageSize = 50, userId, entity, action, search, dateFrom, dateTo } = params;
  const skip = (page - 1) * pageSize;

  let countQ = supabase.from("ActivityLog").select("*", { count: "exact", head: true });
  let dataQ = supabase
    .from("ActivityLog")
    .select(`*, user:User!userId(id, name, email), customer:Customer!customerId(id, name)`);

  if (userId) { countQ = countQ.eq("userId", userId); dataQ = dataQ.eq("userId", userId); }
  if (entity) { countQ = countQ.eq("entity", entity); dataQ = dataQ.eq("entity", entity); }
  if (action) { countQ = countQ.eq("action", action); dataQ = dataQ.eq("action", action); }
  if (dateFrom) {
    countQ = countQ.gte("createdAt", new Date(dateFrom).toISOString());
    dataQ = dataQ.gte("createdAt", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    countQ = countQ.lte("createdAt", end.toISOString());
    dataQ = dataQ.lte("createdAt", end.toISOString());
  }
  if (search) {
    countQ = countQ.ilike("description", `%${search}%`);
    dataQ = dataQ.ilike("description", `%${search}%`);
  }

  const [{ count: total }, { data }] = await Promise.all([
    countQ,
    dataQ.order("createdAt", { ascending: false }).range(skip, skip + pageSize - 1),
  ]);

  return {
    data: (data ?? []) as ActivityLogEntry[],
    total: total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((total ?? 0) / pageSize),
  };
}

export async function getActivityUsers() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("User")
    .select("id, name, email")
    .eq("isActive", true)
    .order("name");

  return (data ?? []) as { id: string; name: string | null; email: string }[];
}
