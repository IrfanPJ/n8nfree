import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  amount: z.coerce.number().min(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"]),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number().min(0),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100),
  taxAmount: z.coerce.number().min(0),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0),
  dueAmount: z.coerce.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;
export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
