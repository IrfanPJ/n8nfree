"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  hoursPerPiece,
  hoursNeededForOrder,
  nextAvailableDate,
  loadPercent,
  daysLate,
  piecePayForOrder,
  ratingForTailor,
  isActiveStatus,
  consumesTailorHours,
  isCompletedStatus,
  toIsoDateLocal,
} from "@/lib/production-calc";
import { productionTailorSchema } from "@/validators/production";
import type { ApiResponse } from "@/types";
import type {
  ProductionTailor,
  ProductionOrder,
  ProductionPriceListItem,
  ProductionTailorWorkload,
  ProductionTailorPerformance,
} from "@/types/production";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getProductionTailors(includeInactive = false): Promise<ProductionTailor[]> {
  await requireSession();
  let q = supabase.from("ProductionTailor").select("*");
  if (!includeInactive) q = q.eq("isActive", true);
  const { data } = await q.order("name", { ascending: true });
  return (data ?? []) as ProductionTailor[];
}

export async function getProductionTailorById(id: string): Promise<ProductionTailor | null> {
  await requireSession();
  const { data } = await supabase.from("ProductionTailor").select("*").eq("id", id).maybeSingle();
  return (data as ProductionTailor) ?? null;
}

export async function createProductionTailor(data: unknown): Promise<ApiResponse<ProductionTailor>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionTailorSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const now = new Date().toISOString();
    const id = randomUUID();
    const { error } = await supabase.from("ProductionTailor").insert({
      id,
      name: parsed.data.name,
      jobTitles: parsed.data.jobTitles,
      capacityRaw: parsed.data.capacityRaw || null,
      capacityPcsPerDay: parsed.data.capacityPcsPerDay ?? null,
      totalWorkingHours: parsed.data.totalWorkingHours,
      weeklyOffDay: parsed.data.weeklyOffDay || null,
      monthlySalary: parsed.data.monthlySalary,
      otherAllowance: parsed.data.otherAllowance,
      visaExpense: parsed.data.visaExpense,
      isActive: parsed.data.isActive,
      createdAt: now,
      updatedAt: now,
    });
    if (error) throw error;

    revalidatePath("/production", "layout");
    const tailor = await getProductionTailorById(id);
    return { success: true, data: tailor ?? undefined, message: "Tailor added" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to create tailor" };
  }
}

export async function updateProductionTailor(id: string, data: unknown): Promise<ApiResponse<ProductionTailor>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = productionTailorSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const { error } = await supabase.from("ProductionTailor").update({
      name: parsed.data.name,
      jobTitles: parsed.data.jobTitles,
      capacityRaw: parsed.data.capacityRaw || null,
      capacityPcsPerDay: parsed.data.capacityPcsPerDay ?? null,
      totalWorkingHours: parsed.data.totalWorkingHours,
      weeklyOffDay: parsed.data.weeklyOffDay || null,
      monthlySalary: parsed.data.monthlySalary,
      otherAllowance: parsed.data.otherAllowance,
      visaExpense: parsed.data.visaExpense,
      isActive: parsed.data.isActive,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;

    revalidatePath("/production", "layout");
    const tailor = await getProductionTailorById(id);
    return { success: true, data: tailor ?? undefined, message: "Tailor updated" };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update tailor" };
  }
}

export async function setProductionTailorActive(id: string, isActive: boolean): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    await supabase.from("ProductionTailor").update({ isActive, updatedAt: new Date().toISOString() }).eq("id", id);
    revalidatePath("/production", "layout");
    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, error: "Failed to update tailor status" };
  }
}

type OrderForCalc = Pick<ProductionOrder, "id" | "tailorId" | "qty" | "status" | "priceListItemId"> & {
  priceListItem: Pick<ProductionPriceListItem, "unitPrice" | "estimatedHoursPerPiece"> | null;
};

async function getAllActiveOrdersForCalc(): Promise<OrderForCalc[]> {
  const { data } = await supabase
    .from("ProductionOrder")
    .select("id, tailorId, qty, status, priceListItemId, priceListItem:ProductionPriceListItem!priceListItemId(unitPrice, estimatedHoursPerPiece)")
    .eq("isActive", true);
  return (data ?? []) as unknown as OrderForCalc[];
}

/** Workload cards for the Tailors page: current backlog, next-available date, load %. */
export async function getTailorWorkloads(): Promise<ProductionTailorWorkload[]> {
  await requireSession();
  const [tailors, orders] = await Promise.all([getProductionTailors(false), getAllActiveOrdersForCalc()]);

  return tailors.map((tailor) => {
    const ownOrders = orders.filter((o) => o.tailorId === tailor.id && isActiveStatus(o.status));
    const pcsInHand = ownOrders.reduce((sum, o) => sum + o.qty, 0);
    const activeOrderCount = ownOrders.length;

    const hoursNeeded = ownOrders
      .filter((o) => consumesTailorHours(o.status))
      .reduce((sum, o) => {
        const hrs = hoursPerPiece({
          estimatedHoursPerPiece: o.priceListItem?.estimatedHoursPerPiece ?? null,
          tailorTotalWorkingHours: tailor.totalWorkingHours,
          tailorCapacityPcsPerDay: tailor.capacityPcsPerDay,
        });
        return sum + hoursNeededForOrder(o.qty, hrs);
      }, 0);

    const workDays = tailor.totalWorkingHours > 0 ? Math.ceil(hoursNeeded / tailor.totalWorkingHours) : 0;
    const nextAvail = nextAvailableDate({
      totalHoursNeeded: hoursNeeded,
      totalWorkingHours: tailor.totalWorkingHours,
      weeklyOffDay: tailor.weeklyOffDay,
    });

    return {
      tailor,
      activeOrderCount,
      pcsInHand,
      hoursNeeded: Math.round(hoursNeeded * 100) / 100,
      workDays,
      nextAvailableDate: toIsoDateLocal(nextAvail),
      isAvailableNow: hoursNeeded <= 0,
      loadPercent: loadPercent({ hoursNeeded, totalWorkingHours: tailor.totalWorkingHours, weeklyOffDay: tailor.weeklyOffDay }),
    };
  });
}

/** Performance cards: historical output, delays and piece earnings per tailor. */
export async function getTailorPerformances(): Promise<ProductionTailorPerformance[]> {
  await requireSession();
  const tailors = await getProductionTailors(false);
  const { data } = await supabase
    .from("ProductionOrder")
    .select("id, tailorId, qty, status, deliveryDate, priceListItemId, priceListItem:ProductionPriceListItem!priceListItemId(unitPrice)")
    .eq("isActive", true);
  const orders = (data ?? []) as unknown as Array<
    Pick<ProductionOrder, "id" | "tailorId" | "qty" | "status" | "deliveryDate"> & {
      priceListItem: Pick<ProductionPriceListItem, "unitPrice"> | null;
    }
  >;

  return tailors.map((tailor) => {
    const ownOrders = orders.filter((o) => o.tailorId === tailor.id);
    const totalOrders = ownOrders.length;
    const pcsDone = ownOrders.filter((o) => isCompletedStatus(o.status)).reduce((s, o) => s + o.qty, 0);
    const activeOrders = ownOrders.filter((o) => isActiveStatus(o.status)).length;
    const delayedOrders = ownOrders.filter((o) => daysLate(o.deliveryDate, o.status) > 0).length;
    const pieceEarnings = ownOrders.reduce(
      (sum, o) => sum + piecePayForOrder(o.qty, o.priceListItem?.unitPrice ?? 0, o.status),
      0
    );

    return {
      tailor,
      totalOrders,
      pcsDone,
      activeOrders,
      delayedOrders,
      pieceEarnings,
      rating: ratingForTailor({ totalOrders, pcsDone, delayedCount: delayedOrders }),
    };
  });
}
