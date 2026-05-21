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
};

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
    createdAt: now,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}
