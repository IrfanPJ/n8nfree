import { z } from "zod";

export const FABRIC_TYPES = ["Wool", "Cotton", "Silk", "Linen", "Polyester", "Blend", "Cashmere", "Velvet", "Other"] as const;

export const fabricSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  color: z.string().optional().or(z.literal("")),
  stockQty: z.coerce.number().min(0, "Stock cannot be negative").default(0),
  reorderLevel: z.coerce.number().min(0).default(5),
  supplier: z.string().optional().or(z.literal("")),
  pricePerUnit: z.coerce.number().min(0).default(0),
  unit: z.string().default("m"),
  notes: z.string().optional().or(z.literal("")),
});

export type FabricFormData = z.infer<typeof fabricSchema>;
