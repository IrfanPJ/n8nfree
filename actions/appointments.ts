"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { appointmentSchema } from "@/validators/appointment";
import { sendAppointmentConfirmation } from "@/lib/email";
import type { ApiResponse, AppointmentWithRelations, AppointmentStatus } from "@/types";

export interface GetAppointmentsParams {
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus;
  customerId?: string;
  staffId?: string;
  branch?: string;
}

const APPT_SELECT = `*, customer:Customer!customerId(*), staff:User!staffId(*)`;

export async function getAppointments(params: GetAppointmentsParams = {}): Promise<AppointmentWithRelations[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { dateFrom, dateTo, status, customerId, staffId } = params;

  let q = supabase.from("Appointment").select(APPT_SELECT).eq("isActive", true);

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

  const { data } = await supabase.from("Appointment").select(APPT_SELECT).eq("id", id).maybeSingle();
  return data as AppointmentWithRelations | null;
}

export async function createAppointment(data: unknown): Promise<ApiResponse<AppointmentWithRelations>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from("Appointment").insert({
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
      branch: "Business Bay",
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw error;

    await supabase.from("ActivityLog").insert({
      id: randomUUID(),
      userId: session.user.id,
      customerId: parsed.data.customerId,
      action: "CREATE",
      entity: "Appointment",
      entityId: id,
      description: `Appointment "${parsed.data.title}" scheduled`,
    });

    const { data: appointment } = await supabase.from("Appointment").select(APPT_SELECT).eq("id", id).single();

    const { data: customer } = await supabase.from("Customer").select("email, name").eq("id", parsed.data.customerId).single();
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

  const parsed = appointmentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };

  try {
    const { error } = await supabase.from("Appointment").update({
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

    const { data: appointment } = await supabase.from("Appointment").select(APPT_SELECT).eq("id", id).single();
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

  try {
    await supabase.from("Appointment").update({ status, updatedAt: new Date().toISOString() }).eq("id", id);
    const { data: appointment } = await supabase.from("Appointment").select(APPT_SELECT).eq("id", id).single();

    // Auto Closed Won: when appointment is completed, move linked lead to CLOSED_WON
    const leadId = (appointment as any)?.leadId;
    if (status === "COMPLETED" && leadId) {
      await supabase.from("Lead")
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
  if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    await supabase.from("Appointment").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
    revalidatePath("/appointments");
    return { success: true, message: "Appointment cancelled" };
  } catch {
    return { success: false, error: "Failed to delete appointment" };
  }
}
