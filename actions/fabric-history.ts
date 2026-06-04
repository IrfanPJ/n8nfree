"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export type FabricHistoryType = "code" | "composition" | "price" | "color";

export type FabricHistoryEntry = {
  id: string;
  type: FabricHistoryType;
  value: string;
  createdAt: string;
};

export async function getFabricHistory(): Promise<{
  codes: FabricHistoryEntry[];
  compositions: FabricHistoryEntry[];
  prices: FabricHistoryEntry[];
  colors: FabricHistoryEntry[];
}> {
  const session = await auth();
  if (!session?.user) return { codes: [], compositions: [], prices: [], colors: [] };

  const { data } = await supabase
    .from("FabricHistory")
    .select("*")
    .order("createdAt", { ascending: false });

  const entries = (data ?? []) as FabricHistoryEntry[];
  return {
    codes:        entries.filter((e) => e.type === "code"),
    compositions: entries.filter((e) => e.type === "composition"),
    prices:       entries.filter((e) => e.type === "price"),
    colors:       entries.filter((e) => e.type === "color"),
  };
}

export async function getFabricHistoryValues(): Promise<{
  codes: string[];
  compositions: string[];
  prices: string[];
  colors: string[];
}> {
  const h = await getFabricHistory();
  return {
    codes:        h.codes.map((e) => e.value),
    compositions: h.compositions.map((e) => e.value),
    prices:       h.prices.map((e) => e.value),
    colors:       h.colors.map((e) => e.value),
  };
}

export async function upsertFabricValues(values: { type: FabricHistoryType; value: string }[]): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  const rows = values
    .filter((v) => v.value?.toString().trim())
    .map((v) => ({ id: randomUUID(), type: v.type, value: v.value.toString().trim() }));

  if (!rows.length) return;

  await supabase.from("FabricHistory").upsert(rows, { onConflict: "type,value", ignoreDuplicates: true });
}

export async function deleteFabricHistoryEntry(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;

  await supabase.from("FabricHistory").delete().eq("id", id);
  revalidatePath("/settings");
}
