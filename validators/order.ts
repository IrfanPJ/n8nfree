import { z } from "zod";

export const orderItemInputSchema = z.object({
  id: z.string().optional(),
  garmentType: z.string().min(1, "Garment type is required"),
  quantity: z.coerce.number().int().min(1, "Minimum 1").default(1),
  unitPrice: z.coerce.number().min(0, "Price must be non-negative").default(0),
  assignedToId: z.string().optional().transform((v) => v || undefined),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  fabricCode:        z.string().optional().or(z.literal("")),
  fabricComposition: z.string().optional().or(z.literal("")),
  fabricPrice:       z.coerce.number().min(0).optional(),
  fabricColor:       z.string().optional().or(z.literal("")),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  items: z.array(orderItemInputSchema).min(1, "At least one garment item is required"),
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
  assignedToId: z.string().optional().transform((v) => v || undefined),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "MEASUREMENT",
    "FABRIC_ORDERING",
    "FABRIC_COLLECTED",
    "CUTTING",
    "SEMI_STITCH",
    "TRIAL",
    "FINAL_STITCH",
    "READY_FOR_DELIVERY",
    "DELIVERED",
    "PENDING_ALTERATION",
    "READY_FINAL_DELIVERY",
    "ORDER_CLOSED",
  ]),
  notes: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderStatusUpdateData = z.infer<typeof orderStatusUpdateSchema>;
