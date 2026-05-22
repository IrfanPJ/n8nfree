import { z } from "zod";

export const orderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  garmentType: z.string().min(1, "Garment type is required").max(100),
  fabricName: z.string().optional(),
  fabricColor: z.string().optional(),
  fabricQuantity: z.coerce.number().positive().optional(),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  trialDate: z.string().optional(),
  totalAmount: z.coerce.number().min(0, "Total amount must be non-negative"),
  advanceAmount: z.coerce.number().min(0, "Advance amount must be non-negative"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  designNotes: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional().transform(v => v || undefined),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "MEASURING",
    "CUTTING",
    "STITCHING",
    "TRIAL",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ]),
  notes: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderSchema>;
export type OrderStatusUpdateData = z.infer<typeof orderStatusUpdateSchema>;
