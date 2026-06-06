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
  // Upper body
  shirtLength: optionalFloat,
  shoulder: optionalFloat,
  armhole: optionalFloat,
  sleeve: optionalFloat,
  bicep: optionalFloat,
  chest: optionalFloat,
  lowerChest: optionalFloat,
  stomach: optionalFloat,
  hip: optionalFloat,
  neck: optionalFloat,
  backLength: optionalFloat,
  frontLength: optionalFloat,
  // Jacket
  jacketSleeve: optionalFloat,
  jacketLength: optionalFloat,
  // Waistcoat
  waistcoatHalfShoulder: optionalFloat,
  waistcoatLength: optionalFloat,
  // Long Coat
  longCoatSleeve: optionalFloat,
  longCoatLength: optionalFloat,
  // Trouser
  kneeLength: optionalFloat,
  outseam: optionalFloat,
  inseam: optionalFloat,
  waist: optionalFloat,
  thigh: optionalFloat,
  kneeLose: optionalFloat,
  ankle: optionalFloat,
  rise: optionalFloat,
  // Skirt
  skirtLength: optionalFloat,
  skirtBottomHem: optionalFloat,
  // Meta
  department: z.string().optional(),
  trialDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  // Remarks
  upperRemarks: z.string().optional(),
  lowerRemarks: z.string().optional(),
  fabricNotes: z.string().optional(),
  notes: z.string().optional(),
  takenBy: z.string().optional(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;
