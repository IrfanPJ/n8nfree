"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { measurementSchema } from "@/validators/measurement";
import type { ApiResponse } from "@/types";
import type { Measurement } from "@prisma/client";

export async function getMeasurements(customerId?: string): Promise<Measurement[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.measurement.findMany({
    where: customerId ? { customerId } : undefined,
    orderBy: { takenAt: "desc" },
  });
}

export async function getMeasurementById(id: string): Promise<Measurement | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.measurement.findUnique({ where: { id } });
}

export async function createMeasurement(data: unknown): Promise<ApiResponse<Measurement>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = measurementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const measurement = await prisma.measurement.create({
      data: {
        customerId: parsed.data.customerId,
        label: parsed.data.label,
        unit: parsed.data.unit,
        chest: parsed.data.chest ?? null,
        waist: parsed.data.waist ?? null,
        hip: parsed.data.hip ?? null,
        shoulder: parsed.data.shoulder ?? null,
        neck: parsed.data.neck ?? null,
        sleeve: parsed.data.sleeve ?? null,
        armhole: parsed.data.armhole ?? null,
        inseam: parsed.data.inseam ?? null,
        outseam: parsed.data.outseam ?? null,
        rise: parsed.data.rise ?? null,
        thigh: parsed.data.thigh ?? null,
        ankle: parsed.data.ankle ?? null,
        backLength: parsed.data.backLength ?? null,
        frontLength: parsed.data.frontLength ?? null,
        jacketLength: parsed.data.jacketLength ?? null,
        shirtLength: parsed.data.shirtLength ?? null,
        takenBy: parsed.data.takenBy ?? session.user.name ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: parsed.data.customerId,
        action: "CREATE",
        entity: "Measurement",
        entityId: measurement.id,
        description: `Measurement "${measurement.label}" recorded`,
      },
    });

    revalidatePath("/measurements");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true, data: measurement, message: "Measurement saved successfully" };
  } catch (error) {
    console.error("Create measurement error:", error);
    return { success: false, error: "Failed to save measurement" };
  }
}

export async function updateMeasurement(id: string, data: unknown): Promise<ApiResponse<Measurement>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = measurementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const measurement = await prisma.measurement.update({
      where: { id },
      data: {
        label: parsed.data.label,
        unit: parsed.data.unit,
        chest: parsed.data.chest ?? null,
        waist: parsed.data.waist ?? null,
        hip: parsed.data.hip ?? null,
        shoulder: parsed.data.shoulder ?? null,
        neck: parsed.data.neck ?? null,
        sleeve: parsed.data.sleeve ?? null,
        armhole: parsed.data.armhole ?? null,
        inseam: parsed.data.inseam ?? null,
        outseam: parsed.data.outseam ?? null,
        rise: parsed.data.rise ?? null,
        thigh: parsed.data.thigh ?? null,
        ankle: parsed.data.ankle ?? null,
        backLength: parsed.data.backLength ?? null,
        frontLength: parsed.data.frontLength ?? null,
        jacketLength: parsed.data.jacketLength ?? null,
        shirtLength: parsed.data.shirtLength ?? null,
        takenBy: parsed.data.takenBy ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    revalidatePath("/measurements");
    revalidatePath(`/customers/${measurement.customerId}`);
    return { success: true, data: measurement, message: "Measurement updated successfully" };
  } catch (error) {
    console.error("Update measurement error:", error);
    return { success: false, error: "Failed to update measurement" };
  }
}

export async function deleteMeasurement(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const measurement = await prisma.measurement.delete({ where: { id } });
    revalidatePath("/measurements");
    revalidatePath(`/customers/${measurement.customerId}`);
    return { success: true, message: "Measurement deleted" };
  } catch {
    return { success: false, error: "Failed to delete measurement" };
  }
}
