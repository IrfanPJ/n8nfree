import { z } from "zod";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES } from "@/types/production";

export const productionTailorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  jobTitles: z.array(z.string()).min(1, "At least one job title is required"),
  capacityRaw: z.string().optional().or(z.literal("")),
  capacityPcsPerDay: z.coerce.number().min(0).optional(),
  totalWorkingHours: z.coerce.number().min(0).max(24).default(8),
  weeklyOffDay: z.string().optional().or(z.literal("")),
  monthlySalary: z.coerce.number().min(0).default(0),
  otherAllowance: z.coerce.number().min(0).default(0),
  visaExpense: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const productionPriceListItemSchema = z.object({
  item: z.string().min(1, "Item name is required"),
  unitPrice: z.coerce.number().min(0).default(0),
  estimatedHoursPerPiece: z.coerce.number().min(0).optional(),
});

export const productionItemAliasSchema = z.object({
  rawItem: z.string().min(1),
  priceListItemId: z.string().min(1, "Select a price list item"),
});

export const productionOrderSchema = z.object({
  sourceRowId: z.coerce.number().int().optional(),
  receivedDate: z.string().min(1, "Received date is required"),
  store: z.enum(PRODUCTION_STORES as [string, ...string[]]),
  invoiceNo: z.string().min(1, "Invoice number is required"),
  notes: z.string().optional().or(z.literal("")),
  itemRaw: z.string().min(1, "Item is required"),
  priceListItemId: z.string().optional().transform((v) => v || undefined),
  qty: z.coerce.number().int().min(1).default(1),
  tailorId: z.string().optional().transform((v) => v || undefined),
  deliveryDate: z.string().optional().or(z.literal("")),
  dispatchTime: z.string().optional().or(z.literal("")),
  scheduledDispatchDate: z.string().optional().or(z.literal("")),
  possibleTime: z.string().optional().or(z.literal("")),
  status: z.enum(PRODUCTION_ORDER_STATUSES as [string, ...string[]]),
  remarks: z.string().optional().or(z.literal("")),
});

export const productionOrderStatusUpdateSchema = z.object({
  status: z.enum(PRODUCTION_ORDER_STATUSES as [string, ...string[]]),
});

export type ProductionTailorFormData = z.infer<typeof productionTailorSchema>;
export type ProductionPriceListItemFormData = z.infer<typeof productionPriceListItemSchema>;
export type ProductionOrderFormData = z.infer<typeof productionOrderSchema>;
