"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getScopedClient } from "@/lib/supabase-scoped";
import { getActiveBranchCookie } from "@/lib/active-branch";
import { resolveActiveBranchId, resolveReadBranchFilter, NO_ACTIVE_BRANCH_ERROR } from "@/lib/branch-context";
import { appointmentSchema } from "@/validators/appointment";
import { sendAppointmentConfirmation } from "@/lib/email";
import type { ApiResponse, AppointmentWithRelations, AppointmentStatus } from "@/types";

export interface GetAppointmentsParams {
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus;
  customerId?: string;
  staffId?: string;
}

const APPT_SELECT = `*, customer:Customer!customerId(*), staff:User!staffId(*)`;

export async function getAppointments(params: GetAppointmentsParams = {}): Promise<AppointmentWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const { dateFrom, dateTo, status, customerId, staffId } = params;

  let q = db.from("Appointment").select(APPT_SELECT).eq("isActive", true);

  const branchFilter = resolveReadBranchFilter(session, await getActiveBranchCookie());
  if (branchFilter) q = q.eq("branchId", branchFilter);
  if (status) q = q.eq("status", status);
  if (customerId) q = q.eq("customerId", customerId);
  if (staffId) q = q.eq("staffId", staffId);
  if (dateFrom) q = q.gte("startTime", new Date(dateFrom).toISOString());
  if (dateTo) q = q.lte("startTime", new Date(dateTo).toISOString());

  const { data } = await q.order("startTime", { ascending: true });
  return (data ?? []) as AppointmentWithRelations[];
}

export async function getAppointmentById(id: string): Promise<AppointmentWithRelations | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const db = await getScopedClient(session);

  const { data } = await db.from("Appointment").select(APPT_SELECT).eq("id", id).maybeSingle();
  return data as AppointmentWithRelations | null;
}

export async function createAppointment(data: unknown): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);
  const branchId = resolveActiveBranchId(session, await getActiveBranchCookie());
  if (!branchId) return { success: false, error: NO_ACTIVE_BRANCH_ERROR };

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await db.from("Appointment").insert({
      id,
      customerId: parsed.data.customerId,
      staffId: parsed.data.staffId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      status: parsed.data.status,
      startTime: new Date(parsed.data.startTime).toISOString(),
      endTime: new Date(parsed.data.endTime).toISOString(),
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt).toISOString() : null,
      leadId: parsed.data.leadId || null,
      branchId,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    await db.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      branchId,
      action: "CREATE",
      entity: "Appointment",
      entityId: id,
      description: `Appointment "${parsed.data.title}" scheduled`,
    });

    const { data: appointment } = await db.from("Appointment").select(APPT_SELECT).eq("id", id).single();

    const { data: customer } = await db.from("Customer").select("email, name").eq("id", parsed.data.customerId).single();
    if (customer?.email) {
      sendAppointmentConfirmation({
        to: customer.email,
        customerName: customer.name,
        title: parsed.data.title,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        location: parsed.data.location,
        notes: parsed.data.notes,
      }).catch(() => {});
    }

    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Appointment created" };
  } catch (error) {
    console.error("Create appointment error:", error);
    return { success: false, error: "Failed to create appointment" };
  }
}

export async function updateAppointment(id: string, data: unknown): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const { error } = await db.from("Appointment").update({
      customerId: parsed.data.customerId,
      staffId: parsed.data.staffId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      status: parsed.data.status,
      startTime: new Date(parsed.data.startTime).toISOString(),
      endTime: new Date(parsed.data.endTime).toISOString(),
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt).toISOString() : null,
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    if (error) throw error;

    const { data: appointment } = await db.from("Appointment").select(APPT_SELECT).eq("id", id).single();
    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Appointment updated" };
  } catch (error) {
    console.error("Update appointment error:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  const db = await getScopedClient(session);

  try {
    await db.from("Appointment").update({ status, updatedAt: new Date().toISOString() }).eq("id", id);
    const { data: appointment } = await db.from("Appointment").select(APPT_SELECT).eq("id", id).single();

    // Auto Closed Won: when appointment is completed, move linked lead to CLOSED_WON
    const leadId = (appointment as any)?.leadId;
    if (status === "COMPLETED" && leadId) {
      await db.from("Lead")
        .update({ stage: "CLOSED_WON", updatedAt: new Date().toISOString() })
        .eq("id", leadId);
      revalidatePath("/leads");
    }

    revalidatePath("/appointments");
    return { success: true, data: appointment as AppointmentWithRelations, message: "Status updated" };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteAppointment(id: string): Promise<ApiResponse<void>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }
  const db = await getScopedClient(session);

  try {
    const { error } = await db.from("Appointment").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    revalidatePath("/appointments");
    return { success: true, message: "Appointment cancelled" };
  } catch {
    return { success: false, error: "Failed to delete appointment" };
  }
}
