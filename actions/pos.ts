"use server";

import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter, NO_ACTIVE_BRANCH_ERROR } from "@/lib/branch-context";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export type POSSalePayload = {
  receiptNo: string;
  clientName: string;
  items: { id: string; name: string; price: number; category: string; qty: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "CARD";
};

export async function getPOSSales(params: { limit?: number } = {}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  let q = db
    .from("POSSale")
    .select("id, receiptNo, clientName, items, subtotal, tax, total, paymentMethod, branchId, createdAt");

  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());
  if (branchFilter) q = q.eq("branchId", branchFilter);

  const { data, error } = await q.order("createdAt", { ascending: false }).limit(params.limit ?? 50);

  if (error) return [];
  return data ?? [];
}

export async function createPOSSale(payload: POSSalePayload) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());
  if (!branchId) throw new Error(NO_ACTIVE_BRANCH_ERROR);

  const now = new Date().toISOString();
  const { error } = await db.from("POSSale").insert({
    id: randomUUID(),
    receiptNo: payload.receiptNo,
    clientName: payload.clientName || null,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: payload.tax,
    total: payload.total,
    paymentMethod: payload.paymentMethod,
    branchId,
    createdAt: now,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}
