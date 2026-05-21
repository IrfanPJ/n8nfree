"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { appointmentSchema } from "@/validators/appointment";
import type { ApiResponse, AppointmentWithRelations } from "@/types";
import type { AppointmentStatus } from "@prisma/client";

export interface GetAppointmentsParams {
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus;
  customerId?: string;
  staffId?: string;
}

export async function getAppointments(
  params: GetAppointmentsParams = {}
): Promise<AppointmentWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { dateFrom, dateTo, status, customerId, staffId } = params;

  return prisma.appointment.findMany({
    where: {
      isActive: true,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(staffId && { staffId }),
      ...(dateFrom || dateTo
        ? {
            startTime: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    },
    include: {
      customer: true,
      staff: true,
    },
    orderBy: { startTime: "asc" },
  }) as Promise<AppointmentWithRelations[]>;
}

export async function getAppointmentById(id: string): Promise<AppointmentWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.appointment.findUnique({
    where: { id },
    include: { customer: true, staff: true },
  }) as Promise<AppointmentWithRelations | null>;
}

export async function createAppointment(data: unknown): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        customerId: parsed.data.customerId,
        staffId: parsed.data.staffId ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        status: parsed.data.status,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        location: parsed.data.location ?? null,
        notes: parsed.data.notes ?? null,
        reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
      },
      include: { customer: true, staff: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        customerId: parsed.data.customerId,
        action: "CREATE",
        entity: "Appointment",
        entityId: appointment.id,
        description: `Appointment "${appointment.title}" scheduled`,
      },
    });

    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Appointment created" };
  } catch (error) {
    console.error("Create appointment error:", error);
    return { success: false, error: "Failed to create appointment" };
  }
}

export async function updateAppointment(
  id: string,
  data: unknown
): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        customerId: parsed.data.customerId,
        staffId: parsed.data.staffId ?? null,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        status: parsed.data.status,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        location: parsed.data.location ?? null,
        notes: parsed.data.notes ?? null,
        reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
      },
      include: { customer: true, staff: true },
    });

    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Appointment updated" };
  } catch (error) {
    console.error("Update appointment error:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { customer: true, staff: true },
    });

    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Status updated" };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteAppointment(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    await prisma.appointment.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/appointments");
    return { success: true, message: "Appointment cancelled" };
  } catch {
    return { success: false, error: "Failed to delete appointment" };
  }
}
