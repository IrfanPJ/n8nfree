import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "FITTING",
  "MEASUREMENT",
  "TRIAL",
  "DELIVERY",
  "CONSULTATION",
  "OTHER",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  FITTING: "Fitting",
  MEASUREMENT: "Measurement",
  TRIAL: "Trial",
  DELIVERY: "Delivery",
  CONSULTATION: "Consultation",
  OTHER: "Other",
};

export const appointmentSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    staffId: z.string().optional(),
    title: z.string().min(2, "Title must be at least 2 characters").max(200),
    description: z.string().optional(),
    type: z.enum(APPOINTMENT_TYPES),
    status: z.enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().optional(),
    notes: z.string().optional(),
    reminderAt: z.string().optional(),
    leadId: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.startTime) < new Date(data.endTime),
    { message: "End time must be after start time", path: ["endTime"] }
  );

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
