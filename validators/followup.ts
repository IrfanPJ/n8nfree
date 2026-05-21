import { z } from "zod";

export const followUpSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  staffId: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type FollowUpFormData = z.infer<typeof followUpSchema>;
