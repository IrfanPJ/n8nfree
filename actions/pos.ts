"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
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
  branch?: string;
};

export async function getPOSSales(params: { limit?: number } = {}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("POSSale")
    .select("id, receiptNo, clientName, items, subtotal, tax, total, paymentMethod, branch, createdAt")
    .order("createdAt", { ascending: false })
    .limit(params.limit ?? 50);

  if (error) return [];
  return data ?? [];
}

export async function createPOSSale(payload: POSSalePayload) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date().toISOString();
  const { error } = await supabase.from("POSSale").insert({
    id: randomUUID(),
    receiptNo: payload.receiptNo,
    clientName: payload.clientName || null,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: payload.tax,
    total: payload.total,
    paymentMethod: payload.paymentMethod,
    branch: "Business Bay",
    createdAt: now,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}
