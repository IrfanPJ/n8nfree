"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { normalizeItemText } from "@/lib/production-import";
import { productionPriceListItemSchema } from "@/validators/production";
import type { ApiResponse } from "@/types";
import type { ProductionPriceListItem } from "@/types/production";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getProductionPriceListItems(): Promise<ProductionPriceListItem[]> {
  await requireSession();
  const { data } = await supabase.from("ProductionPriceListItem").select("*").order("item", { ascending: true });
  return (data ?? []) as ProductionPriceListItem[];
}

export async function createProductionPriceListItem(data: unknown): Promise<ApiResponse<ProductionPriceListItem>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionPriceListItemSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const row: ProductionPriceListItem = {
      id,
      sourceRowId: null,
      item: parsed.data.item,
      unitPrice: parsed.data.unitPrice,
      estimatedHoursPerPiece: parsed.data.estimatedHoursPerPiece ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabase.from("ProductionPriceListItem").insert(row);
    if (error) throw error;

    revalidatePath("/production", "layout");
    return { success: true, data: row, message: "Price list item added" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to create price list item" };
  }
}

export async function updateProductionPriceListItem(id: string, data: unknown): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionPriceListItemSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const { error } = await supabase.from("ProductionPriceListItem").update({
      item: parsed.data.item,
      unitPrice: parsed.data.unitPrice,
      estimatedHoursPerPiece: parsed.data.estimatedHoursPerPiece ?? null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;

    revalidatePath("/production", "layout");
    return { success: true, message: "Price list item updated" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update price list item" };
  }
}

/** Distinct raw item strings among orders that never resolved to a price list item. */
export async function getUnmatchedProductionItems(): Promise<string[]> {
  await requireSession();
  const { data } = await supabase
    .from("ProductionOrder")
    .select("itemRaw")
    .is("priceListItemId", null)
    .eq("isActive", true);
  return [...new Set((data ?? []).map((o: { itemRaw: string }) => o.itemRaw))];
}

/**
 * Manually maps a raw item string to a price list item — used from the UI
 * when the importer couldn't auto-match one. Applies retroactively to every
 * existing order sharing that raw text, and to future imports (via
 * ProductionItemAlias).
 */
export async function createProductionItemAlias(rawItem: string, priceListItemId: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const normalized = normalizeItemText(rawItem);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ProductionItemAlias")
      .upsert(
        { id: randomUUID(), rawItem: normalized, priceListItemId, createdAt: now, updatedAt: now },
        { onConflict: "rawItem" }
      );
    if (error) throw error;

    await supabase
      .from("ProductionOrder")
      .update({ priceListItemId, updatedAt: now })
      .eq("itemRaw", normalized);

    revalidatePath("/production", "layout");
    return { success: true, message: "Item mapping saved" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to save item mapping" };
  }
}

/**
 * Hard delete — safe because ProductionOrder.priceListItemId is
 * ON DELETE SET NULL: orders referencing this item just become unmatched
 * (visible again in Sheet View / getUnmatchedProductionItems) rather than
 * being deleted themselves.
 */
export async function deleteProductionPriceListItem(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    const { error } = await supabase.from("ProductionPriceListItem").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/production", "layout");
    return { success: true, message: "Price list item deleted" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to delete price list item" };
  }
}
