import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  address: z.string().optional(),
  city: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isVIP: z.boolean().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
