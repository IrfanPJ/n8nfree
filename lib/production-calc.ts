// Pure calculation functions for the Production module. These drive money
// (piece pay, CTC) and delivery commitments (days late, capacity planning),
// so they're kept side-effect free and covered by tests/production-calc.test.ts.

import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import {
  PAYABLE_STATUSES,
  COMPLETED_STATUSES,
  type ProductionOrderStatus,
} from "@/types/production";

const WEEKDAY_NAMES = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
] as const;

/**
 * Postgres DATE columns (receivedDate, deliveryDate, ...) come back as plain
 * "YYYY-MM-DD" strings. `new Date("YYYY-MM-DD")` parses that as UTC midnight,
 * which — combined with date-fns's *local*-time startOfDay — silently shifts
 * the calendar day backward by one in any negative-UTC-offset timezone. Parse
 * date-only strings as a local date explicitly to avoid that.
 */
function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) return input;
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(input);
}

/**
 * The inverse of parseDateOnly: formats a Date's *local* calendar day as
 * "YYYY-MM-DD". Deliberately not `date.toISOString().slice(0, 10)`, which
 * converts to UTC first and silently shifts the date near local midnight
 * (e.g. any time before 4am in UTC+4 becomes the previous day in UTC).
 */
export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Used when neither the price list nor the tailor's capacity text yields a
// usable per-piece hour estimate. Deliberately conservative (1 piece ≈ 1hr)
// rather than silently treating unknown work as free.
export const DEFAULT_HOURS_PER_PIECE = 1;

export function isPayableStatus(status: string): boolean {
  return (PAYABLE_STATUSES as string[]).includes(status);
}

export function isCompletedStatus(status: string): boolean {
  return (COMPLETED_STATUSES as string[]).includes(status);
}

// Orders in these statuses are done, one way or another, and shouldn't count
// toward "active"/"remaining" KPIs or a tailor's current workload.
export const TERMINAL_STATUSES: ProductionOrderStatus[] = ["DELIVERED", "DISPATCHED", "CANCELLED"];

export function isActiveStatus(status: string): boolean {
  return !(TERMINAL_STATUSES as string[]).includes(status);
}

// The subset of "active" statuses where the garment still needs the
// tailor's physical work. Once an order reaches TRIAL READY / READY FOR
// DELIVERY / READY FOR DISPATCH, the sewing is done — it's just waiting on
// logistics or a customer trial — so it no longer consumes tailor hours.
export const HOURS_CONSUMING_STATUSES: ProductionOrderStatus[] = [
  "IN PRODUCTION", "NEXT IN LINE", "ON HOLD", "PENDING", "CUTTING NOT RECEIVED", "TRIAL COMPLETED",
];

export function consumesTailorHours(status: string): boolean {
  return (HOURS_CONSUMING_STATUSES as string[]).includes(status);
}

export function getWeekdayName(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()];
}

/**
 * Parses free-text capacity descriptions like:
 *   "4 to 5 shirts daily if only making shirt, 3 to 3.5 Trousers Daily..."
 *   "1.25 Jacket daily, 4 to 5 Trial Jackets daily..."
 *   "3 to 3.5 trouser per day"
 * into a single average pcs/day number, using the first number or range
 * found in the text. Returns null if no number can be found.
 */
export function parseCapacityText(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const rangeMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);
  const singleMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (!singleMatch || singleMatch.index === undefined) return null;

  // Only treat it as a range if the range match starts at (or before) the
  // first standalone number — otherwise the first number in the text is a
  // lone figure and a range elsewhere belongs to a later, unrelated clause
  // (e.g. "1.25 Jacket daily, 4 to 5 Trial Jackets daily" -> 1.25, not 4.5).
  if (rangeMatch && rangeMatch.index !== undefined && rangeMatch.index <= singleMatch.index) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    return Math.round(((lo + hi) / 2) * 100) / 100;
  }
  return parseFloat(singleMatch[1]);
}

/**
 * Days Late = today − Delivery Date, only when positive and the order
 * hasn't reached a completed state (DELIVERED/DISPATCHED).
 */
export function daysLate(
  deliveryDate: string | Date | null | undefined,
  status: string,
  today: Date = new Date()
): number {
  if (!deliveryDate || isCompletedStatus(status)) return 0;
  const due = startOfDay(parseDateOnly(deliveryDate));
  const diff = differenceInCalendarDays(startOfDay(today), due);
  return diff > 0 ? diff : 0;
}

/** Calendar days from `today` until `date` (0 if today, negative if in the past). */
export function daysUntil(date: string | Date, today: Date = new Date()): number {
  return differenceInCalendarDays(startOfDay(parseDateOnly(date)), startOfDay(today));
}

/**
 * Hours needed to produce one piece of an item. Prefers an explicit
 * per-item estimate; falls back to deriving from the assigned tailor's
 * capacity (Total Working Hours ÷ parsed daily pcs capacity), and finally
 * to DEFAULT_HOURS_PER_PIECE if neither is available.
 */
export function hoursPerPiece(params: {
  estimatedHoursPerPiece?: number | null;
  tailorTotalWorkingHours?: number | null;
  tailorCapacityPcsPerDay?: number | null;
}): number {
  const { estimatedHoursPerPiece, tailorTotalWorkingHours, tailorCapacityPcsPerDay } = params;
  if (estimatedHoursPerPiece != null && estimatedHoursPerPiece > 0) {
    return estimatedHoursPerPiece;
  }
  if (
    tailorTotalWorkingHours != null &&
    tailorTotalWorkingHours > 0 &&
    tailorCapacityPcsPerDay != null &&
    tailorCapacityPcsPerDay > 0
  ) {
    return tailorTotalWorkingHours / tailorCapacityPcsPerDay;
  }
  return DEFAULT_HOURS_PER_PIECE;
}

/** Hours Needed for an order = Qty × hours per piece for its item type. */
export function hoursNeededForOrder(qty: number, hrsPerPiece: number): number {
  return qty * hrsPerPiece;
}

/**
 * Walks forward day by day from `today`, skipping the tailor's weekly off
 * day, accumulating available hours per day, until cumulative available
 * hours reaches `totalHoursNeeded`. Returns that date — "today" if there's
 * no backlog (0 hours needed).
 */
export function nextAvailableDate(params: {
  totalHoursNeeded: number;
  totalWorkingHours: number;
  weeklyOffDay: string | null | undefined;
  today?: Date;
}): Date {
  const { totalHoursNeeded, totalWorkingHours, weeklyOffDay, today = new Date() } = params;
  const start = startOfDay(today);
  if (totalHoursNeeded <= 0) return start;

  const offDay = weeklyOffDay?.toUpperCase().trim();
  let cumulative = 0;
  // Hard cap avoids an infinite loop if totalWorkingHours is 0.
  for (let i = 0; i < 365; i++) {
    const day = addDays(start, i);
    if (getWeekdayName(day) !== offDay && totalWorkingHours > 0) {
      cumulative += totalWorkingHours;
    }
    if (cumulative >= totalHoursNeeded) return day;
  }
  return addDays(start, 365);
}

/**
 * Load % = Hours Needed (current backlog) ÷ one week's available hours
 * (Working Hours/day × working days in week, excluding the weekly off day).
 */
export function loadPercent(params: {
  hoursNeeded: number;
  totalWorkingHours: number;
  weeklyOffDay: string | null | undefined;
}): number {
  const { hoursNeeded, totalWorkingHours, weeklyOffDay } = params;
  const workingDaysPerWeek = weeklyOffDay ? 6 : 7;
  const weeklyCapacity = totalWorkingHours * workingDaysPerWeek;
  if (weeklyCapacity <= 0) return 0;
  return Math.round((hoursNeeded / weeklyCapacity) * 1000) / 10;
}

/** CTC is always recomputed from its components — never trust a stored total. */
export function computeCTC(monthlySalary: number, otherAllowance: number, visaExpense: number): number {
  return (monthlySalary || 0) + (otherAllowance || 0) + (visaExpense || 0);
}

/** Piece pay is only earned in payable statuses (see PAYABLE_STATUSES). */
export function piecePayForOrder(qty: number, unitPrice: number, status: string): number {
  return isPayableStatus(status) ? qty * unitPrice : 0;
}

export type TailorRating = "EXCELLENT" | "NEEDS ATTENTION" | "NEW" | "STANDARD";

const NEEDS_ATTENTION_DELAYED_RATIO = 0.15;
const EXCELLENT_DELAYED_RATIO = 0.05;
const EXCELLENT_MIN_PCS_DONE = 10;

export function ratingForTailor(params: {
  totalOrders: number;
  pcsDone: number;
  delayedCount: number;
}): TailorRating {
  const { totalOrders, pcsDone, delayedCount } = params;
  if (totalOrders === 0) return "NEW";
  const delayedRatio = delayedCount / totalOrders;
  if (delayedRatio > NEEDS_ATTENTION_DELAYED_RATIO) return "NEEDS ATTENTION";
  if (delayedRatio < EXCELLENT_DELAYED_RATIO && pcsDone > EXCELLENT_MIN_PCS_DONE) return "EXCELLENT";
  return "STANDARD";
}

export type DeliveryUrgency = "overdue" | "today" | "tomorrow" | "nearing" | "later" | "none";

/** Bucketing used by the Calendar and Suggestions pages' summary chips. */
export function deliveryUrgency(
  deliveryDate: string | Date | null | undefined,
  status: string,
  today: Date = new Date()
): DeliveryUrgency {
  if (!deliveryDate || isCompletedStatus(status)) return "none";
  const due = startOfDay(parseDateOnly(deliveryDate));
  const diff = differenceInCalendarDays(due, startOfDay(today));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 3) return "nearing";
  return "later";
}
