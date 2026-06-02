import { z } from "zod";

export const LEAD_STAGES = [
  "ENQUIRY",
  "INTERESTED",
  "QUOTED",
  "APPOINTMENT_CONFIRMED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "IRRELEVANT",
] as const;

export const PIPELINE_STAGES = [
  "ENQUIRY",
  "INTERESTED",
  "QUOTED",
  "APPOINTMENT_CONFIRMED",
  "CLOSED_WON",
] as const;

export const LEAD_STAGE_LABELS: Record<string, string> = {
  ENQUIRY:               "Enquiry",
  INTERESTED:            "Interested",
  QUOTED:                "Quoted",
  APPOINTMENT_CONFIRMED: "Appointment Confirmed",
  CLOSED_WON:            "Closed Won",
  CLOSED_LOST:           "Closed Lost",
  IRRELEVANT:            "Irrelevant",
};

export const LEAD_SOURCES = [
  "WhatsApp",
  "Instagram",
  "Google",
  "Meta Ads",
  "Referral",
  "Walk-in",
  "Others",
] as const;

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  interest: z.string().optional().or(z.literal("")),
  stage: z.enum(LEAD_STAGES).default("ENQUIRY"),
  notes: z.string().optional().or(z.literal("")),
  value: z.coerce.number().min(0).default(0),
  source: z.string().optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;
export type LeadStage = typeof LEAD_STAGES[number];
