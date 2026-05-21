"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { data } = await supabase
    .from("Product")
    .select("id, name, price, category")
    .eq("isActive", true)
    .order("category")
    .order("name");

  return data ?? [];
}

export async function createProduct(input: { name: string; price: number; category: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date().toISOString();
  const { error } = await supabase.from("Product").insert({
    id: randomUUID(),
    name: input.name,
    price: input.price,
    category: input.category,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pos");
}

export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("Product")
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/pos");
}
