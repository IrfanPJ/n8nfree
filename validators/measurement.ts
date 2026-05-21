import { z } from "zod";

const optionalFloat = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(n) ? undefined : n;
  })
  .optional();

export const measurementSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  label: z.string().min(1, "Label is required").max(100),
  unit: z.enum(["inches", "cm"]),
  chest: optionalFloat,
  waist: optionalFloat,
  hip: optionalFloat,
  shoulder: optionalFloat,
  neck: optionalFloat,
  sleeve: optionalFloat,
  armhole: optionalFloat,
  inseam: optionalFloat,
  outseam: optionalFloat,
  rise: optionalFloat,
  thigh: optionalFloat,
  ankle: optionalFloat,
  backLength: optionalFloat,
  frontLength: optionalFloat,
  jacketLength: optionalFloat,
  shirtLength: optionalFloat,
  takenBy: z.string().optional(),
  notes: z.string().optional(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;
