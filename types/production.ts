// ── Production module (tailoring workshop schedule) ────────────────────────
// Independent of the CRM's Order/Customer/TailorMaster types — this models
// the physical workshop roster, price list, and production schedule seeded
// from the "SHJ Production Schedules" spreadsheet.

export type ProductionStore = "SHJ" | "DXB" | "AUH" | "KSA";

export const PRODUCTION_STORES: ProductionStore[] = ["SHJ", "DXB", "AUH", "KSA"];

export type ProductionOrderStatus =
  | "IN PRODUCTION"
  | "NEXT IN LINE"
  | "READY FOR DELIVERY"
  | "READY FOR DISPATCH"
  | "DISPATCHED"
  | "DELIVERED"
  | "TRIAL READY"
  | "TRIAL COMPLETED"
  | "RETURN ITEMS"
  | "ON HOLD"
  | "PENDING"
  | "CANCELLED"
  | "CUTTING NOT RECEIVED";

export const PRODUCTION_ORDER_STATUSES: ProductionOrderStatus[] = [
  "IN PRODUCTION",
  "NEXT IN LINE",
  "READY FOR DELIVERY",
  "READY FOR DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "TRIAL READY",
  "TRIAL COMPLETED",
  "RETURN ITEMS",
  "ON HOLD",
  "PENDING",
  "CANCELLED",
  "CUTTING NOT RECEIVED",
];

// Piece-rate pay is only earned once an item has reached one of these states.
export const PAYABLE_STATUSES: ProductionOrderStatus[] = [
  "DISPATCHED",
  "DELIVERED",
  "READY FOR DELIVERY",
  "READY FOR DISPATCH",
  "TRIAL READY",
];

export const COMPLETED_STATUSES: ProductionOrderStatus[] = ["DELIVERED", "DISPATCHED"];

export type ProductionTailor = {
  id: string;
  sourceRowId: number | null;
  name: string;
  jobTitles: string[];
  capacityRaw: string | null;
  capacityPcsPerDay: number | null;
  totalWorkingHours: number;
  weeklyOffDay: string | null;
  monthlySalary: number;
  otherAllowance: number;
  visaExpense: number;
  totalCostToCompany: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductionPriceListItem = {
  id: string;
  sourceRowId: number | null;
  item: string;
  unitPrice: number;
  estimatedHoursPerPiece: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductionItemAlias = {
  id: string;
  rawItem: string;
  priceListItemId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrder = {
  id: string;
  sourceRowId: number | null;
  receivedDate: string;
  store: ProductionStore;
  invoiceNo: string;
  notes: string | null;
  itemRaw: string;
  priceListItemId: string | null;
  qty: number;
  tailorId: string | null;
  tailorNameRaw: string | null;
  deliveryDate: string | null;
  dispatchTime: string | null;
  scheduledDispatchDate: string | null;
  suggestedDispatchDate: string | null;
  possibleTime: string | null;
  status: ProductionOrderStatus;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderWithRelations = ProductionOrder & {
  tailor: Pick<ProductionTailor, "id" | "name" | "jobTitles"> | null;
  priceListItem: Pick<ProductionPriceListItem, "id" | "item" | "unitPrice" | "estimatedHoursPerPiece"> | null;
};

export type ProductionOverviewStats = {
  activeOrders: number;
  pcsInHand: number;
  daysToFinish: number;
  totalOrders: number;
  pcsCompleted: number;
  delayed: number;
  trialReadyPcs: number;
  returnItemsPcs: number;
  cancelledOrders: number;
  remaining: number;
};

export type ProductionTailorWorkload = {
  tailor: ProductionTailor;
  activeOrderCount: number;
  pcsInHand: number;
  hoursNeeded: number;
  workDays: number;
  nextAvailableDate: string; // ISO date
  isAvailableNow: boolean;
  loadPercent: number;
};

export type ProductionTailorPerformance = {
  tailor: ProductionTailor;
  totalOrders: number;
  pcsDone: number;
  activeOrders: number;
  delayedOrders: number;
  pieceEarnings: number;
  rating: "EXCELLENT" | "NEEDS ATTENTION" | "NEW" | "STANDARD";
};

export type ProductionImportResult = {
  success: boolean;
  error?: string;
  tailors: { created: number; updated: number };
  priceListItems: { created: number; updated: number };
  orders: { created: number; updated: number; skipped: number };
  unmatchedItems: string[];
};
