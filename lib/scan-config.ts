import type { OrderStatus } from "@/types";

export const POSITION_STAGE_MAP: Record<string, OrderStatus[]> = {
  SALES_STAFF:           ["MEASUREMENT", "TRIAL"],
  LEAD_MANAGEMENT_STAFF: ["MEASUREMENT", "TRIAL"],
  PURCHASE_STAFF:        ["FABRIC_ORDERING", "FABRIC_COLLECTED"],
  PRODUCTION_IN_CHARGE:  ["CUTTING", "SEMI_STITCH", "FINAL_STITCH", "PENDING_ALTERATION"],
  MASTER:                ["CUTTING"],
  TAILOR:                ["SEMI_STITCH", "FINAL_STITCH"],
  QUALITY_CHECK:         ["TRIAL", "READY_FOR_DELIVERY", "PENDING_ALTERATION", "READY_FINAL_DELIVERY"],
  LOGISTICS_COORDINATOR: ["DELIVERED", "ORDER_CLOSED"],
};

export const ALL_STAGES: OrderStatus[] = [
  "MEASUREMENT", "FABRIC_ORDERING", "FABRIC_COLLECTED", "CUTTING",
  "SEMI_STITCH", "TRIAL", "FINAL_STITCH", "READY_FOR_DELIVERY",
  "DELIVERED", "PENDING_ALTERATION", "READY_FINAL_DELIVERY", "ORDER_CLOSED",
];

export const STATUS_LABELS: Record<string, string> = {
  MEASUREMENT:          "Measurement",
  FABRIC_ORDERING:      "Fabric Ordering",
  FABRIC_COLLECTED:     "Fabric Collected",
  CUTTING:              "Cutting",
  SEMI_STITCH:          "Semi Stitch",
  TRIAL:                "Trial",
  FINAL_STITCH:         "Final Stitch",
  READY_FOR_DELIVERY:   "Ready for Delivery",
  DELIVERED:            "Delivered",
  PENDING_ALTERATION:   "Pending Alteration",
  READY_FINAL_DELIVERY: "Ready Final Delivery",
  ORDER_CLOSED:         "Order Closed",
};
