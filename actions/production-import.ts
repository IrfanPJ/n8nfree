"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { parseCapacityText } from "@/lib/production-calc";
import { parseProductionWorkbook, normalizeItemText } from "@/lib/production-import";
import type { ProductionImportResult } from "@/types/production";

const IMPORT_ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

/**
 * Imports the "SHJ Production Schedules" workbook, upserting into
 * ProductionTailor / ProductionPriceListItem / ProductionOrder. Idempotent:
 * re-uploading the same (or an updated) sheet updates existing rows by their
 * "Sl No." rather than duplicating them — see the migration file for why
 * Invoice+Item wasn't safe to use as the key instead.
 */
export async function importProductionWorkbook(base64Data: string): Promise<ProductionImportResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized", tailors: { created: 0, updated: 0 }, priceListItems: { created: 0, updated: 0 }, orders: { created: 0, updated: 0, skipped: 0 }, unmatchedItems: [] };
  }
  if (!IMPORT_ALLOWED_ROLES.includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions", tailors: { created: 0, updated: 0 }, priceListItems: { created: 0, updated: 0 }, orders: { created: 0, updated: 0, skipped: 0 }, unmatchedItems: [] };
  }

  try {
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const parsed = parseProductionWorkbook(buffer);
    const now = new Date().toISOString();

    // ── Price list ──────────────────────────────────────────────────────
    const { data: existingPriceItems } = await supabase
      .from("ProductionPriceListItem")
      .select("id, item, sourceRowId");
    const priceByNormalizedItem = new Map<string, { id: string; sourceRowId: number | null }>();
    for (const p of existingPriceItems ?? []) {
      priceByNormalizedItem.set(normalizeItemText(p.item).toUpperCase(), { id: p.id, sourceRowId: p.sourceRowId });
    }

    let priceCreated = 0, priceUpdated = 0;
    for (const row of parsed.priceListItems) {
      const key = row.item.toUpperCase();
      const existing = priceByNormalizedItem.get(key);
      if (existing) {
        await supabase.from("ProductionPriceListItem").update({
          sourceRowId: row.sourceRowId,
          unitPrice: row.unitPrice,
          updatedAt: now,
        }).eq("id", existing.id);
        priceUpdated++;
      } else {
        const id = randomUUID();
        await supabase.from("ProductionPriceListItem").insert({
          id, sourceRowId: row.sourceRowId, item: row.item, unitPrice: row.unitPrice, createdAt: now, updatedAt: now,
        });
        priceByNormalizedItem.set(key, { id, sourceRowId: row.sourceRowId });
        priceCreated++;
      }
    }

    // ── Tailors ─────────────────────────────────────────────────────────
    const { data: existingTailors } = await supabase
      .from("ProductionTailor")
      .select("id, name, sourceRowId, isActive");
    const tailorBySourceRowId = new Map<number, string>();
    for (const t of existingTailors ?? []) {
      if (t.sourceRowId != null) tailorBySourceRowId.set(t.sourceRowId, t.id);
    }

    let tailorCreated = 0, tailorUpdated = 0;
    for (const row of parsed.tailors) {
      const existingId = tailorBySourceRowId.get(row.sourceRowId);
      const payload = {
        name: row.name,
        jobTitles: row.jobTitles,
        capacityRaw: row.capacityRaw,
        capacityPcsPerDay: null as number | null, // filled in below via parseCapacityText
        totalWorkingHours: row.totalWorkingHours,
        weeklyOffDay: row.weeklyOffDay,
        monthlySalary: row.monthlySalary,
        otherAllowance: row.otherAllowance,
        visaExpense: row.visaExpense,
        updatedAt: now,
      };
      payload.capacityPcsPerDay = parseCapacityText(row.capacityRaw);

      if (existingId) {
        await supabase.from("ProductionTailor").update(payload).eq("id", existingId);
        tailorUpdated++;
      } else {
        const id = randomUUID();
        await supabase.from("ProductionTailor").insert({ id, sourceRowId: row.sourceRowId, ...payload, isActive: true, createdAt: now });
        tailorBySourceRowId.set(row.sourceRowId, id);
        tailorCreated++;
      }
    }

    // Name -> id resolution map. A name matching >1 active tailor is left
    // unresolved (ambiguous) rather than guessed — see ASLAM in the source
    // data (two different people share that first name).
    const { data: allTailors } = await supabase.from("ProductionTailor").select("id, name, isActive").eq("isActive", true);
    const tailorIdsByName = new Map<string, string[]>();
    for (const t of allTailors ?? []) {
      const key = normalizeItemText(t.name).toUpperCase();
      tailorIdsByName.set(key, [...(tailorIdsByName.get(key) ?? []), t.id]);
    }

    // ── Item alias overrides (manual fuzzy-match fixes from the UI) ─────
    const { data: aliases } = await supabase.from("ProductionItemAlias").select("rawItem, priceListItemId");
    const aliasMap = new Map<string, string>();
    for (const a of aliases ?? []) aliasMap.set(normalizeItemText(a.rawItem).toUpperCase(), a.priceListItemId);

    // ── Orders ──────────────────────────────────────────────────────────
    const { data: existingOrders } = await supabase.from("ProductionOrder").select("id, sourceRowId");
    const orderBySourceRowId = new Map<number, string>();
    for (const o of existingOrders ?? []) {
      if (o.sourceRowId != null) orderBySourceRowId.set(o.sourceRowId, o.id);
    }

    let orderCreated = 0, orderUpdated = 0, orderSkipped = 0;
    const unmatchedItems = new Set<string>();
    const ambiguousTailorNames = new Set<string>();

    for (const row of parsed.orders) {
      if (!row.store || !row.receivedDate) {
        // No safe default for store/receivedDate — skip and let the admin
        // fix the source row and re-import rather than misattributing it.
        orderSkipped++;
        continue;
      }

      const itemKey = row.itemRaw.toUpperCase();
      const priceListItemId = aliasMap.get(itemKey) ?? priceByNormalizedItem.get(itemKey)?.id ?? null;
      if (!priceListItemId) unmatchedItems.add(row.itemRaw);

      let tailorId: string | null = null;
      if (row.tailorNameRaw) {
        const matches = tailorIdsByName.get(row.tailorNameRaw) ?? [];
        if (matches.length === 1) tailorId = matches[0];
        else if (matches.length > 1) ambiguousTailorNames.add(row.tailorNameRaw);
      }

      let status = row.status;
      let remarks = row.remarks;
      if (!status) {
        status = "PENDING";
        remarks = [remarks, "[status missing in source, defaulted to PENDING]"].filter(Boolean).join(" ");
      }

      const payload = {
        receivedDate: row.receivedDate,
        store: row.store,
        invoiceNo: row.invoiceNo,
        notes: row.notes,
        itemRaw: row.itemRaw,
        priceListItemId,
        qty: row.qty,
        tailorId,
        tailorNameRaw: row.tailorNameRaw,
        deliveryDate: row.deliveryDate,
        dispatchTime: row.dispatchTime,
        scheduledDispatchDate: row.scheduledDispatchDate,
        suggestedDispatchDate: row.suggestedDispatchDate,
        possibleTime: row.possibleTime,
        status,
        remarks,
        updatedAt: now,
      };

      const existingId = orderBySourceRowId.get(row.sourceRowId);
      if (existingId) {
        await supabase.from("ProductionOrder").update(payload).eq("id", existingId);
        orderUpdated++;
      } else {
        await supabase.from("ProductionOrder").insert({ id: randomUUID(), sourceRowId: row.sourceRowId, ...payload, isActive: true, createdAt: now });
        orderCreated++;
      }
    }

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      action: "IMPORT",
      entity: "ProductionImport",
      entityId: randomUUID(),
      description: `Production schedule import: ${orderCreated} orders created, ${orderUpdated} updated, ${orderSkipped} skipped`,
      metadata: {
        tailors: { created: tailorCreated, updated: tailorUpdated },
        priceListItems: { created: priceCreated, updated: priceUpdated },
        orders: { created: orderCreated, updated: orderUpdated, skipped: orderSkipped },
        unmatchedItems: [...unmatchedItems],
        ambiguousTailorNames: [...ambiguousTailorNames],
        parseErrors: parsed.errors,
      },
    });

    revalidatePath("/production", "layout");

    return {
      success: true,
      tailors: { created: tailorCreated, updated: tailorUpdated },
      priceListItems: { created: priceCreated, updated: priceUpdated },
      orders: { created: orderCreated, updated: orderUpdated, skipped: orderSkipped },
      unmatchedItems: [...unmatchedItems],
    };
  } catch (error) {
    Sentry.captureException(error);
    console.error("Production import error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
      tailors: { created: 0, updated: 0 },
      priceListItems: { created: 0, updated: 0 },
      orders: { created: 0, updated: 0, skipped: 0 },
      unmatchedItems: [],
    };
  }
}
