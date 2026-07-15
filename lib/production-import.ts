// Parsing layer for the Production module's spreadsheet importer. Pure
// functions that turn a workbook into plain row objects — no DB access here
// (that's actions/production-import.ts), so this stays easy to test against
// the actual source file's quirks (mixed date formats, stray whitespace,
// case-inconsistent Store values, etc. — see exploration notes).

import * as XLSX from "xlsx";
import { PRODUCTION_ORDER_STATUSES, PRODUCTION_STORES, type ProductionOrderStatus, type ProductionStore } from "@/types/production";

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
];

/** Excel's day-0 epoch (serial 0 = 1899-12-30, accounting for the 1900 leap-year bug). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** Converts an Excel date serial number to a local midnight Date (date-only, no time component). */
export function excelSerialToDate(serial: number): Date {
  const utcMs = EXCEL_EPOCH_MS + Math.floor(serial) * 86400000;
  const d = new Date(utcMs);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Converts an Excel time-of-day serial (fractional day, e.g. 0.5 = noon) to "HH:MM:SS". */
export function excelSerialToTimeString(serial: number): string {
  const totalSeconds = Math.round((serial % 1) * 86400);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses a spreadsheet date cell that may be an Excel serial number, a Date
 * object, or a hand-typed string like "5-May-26" or "9-july_26" (both occur
 * in the real source file). Returns an ISO "YYYY-MM-DD" string, or null if
 * the value can't be parsed.
 */
export function parseSheetDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return toIsoDate(excelSerialToDate(value));
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2})[\s\-/_]+([A-Za-z]+)[\s\-/_]+(\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthIdx = MONTH_NAMES.indexOf(match[2].slice(0, 3).toLowerCase());
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      if (monthIdx >= 0 && day >= 1 && day <= 31) {
        return toIsoDate(new Date(year, monthIdx, day));
      }
    }
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed !== "") return toIsoDate(excelSerialToDate(asNumber));
    const generic = new Date(trimmed);
    if (!Number.isNaN(generic.getTime())) return toIsoDate(generic);
  }
  return null;
}

/** Parses a time-of-day cell (Excel fractional-day serial, or an "HH:MM" string) to "HH:MM:SS". */
export function parseSheetTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return excelSerialToTimeString(value);
  if (value instanceof Date) {
    return [value.getHours(), value.getMinutes(), value.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const h = String(match[1]).padStart(2, "0");
      return `${h}:${match[2]}:${match[3] ?? "00"}`;
    }
  }
  return null;
}

export function normalizeItemText(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeStore(raw: unknown): ProductionStore | null {
  const s = String(raw ?? "").trim().toUpperCase();
  return (PRODUCTION_STORES as string[]).includes(s) ? (s as ProductionStore) : null;
}

export function normalizeStatus(raw: unknown): ProductionOrderStatus | null {
  const s = String(raw ?? "").trim().toUpperCase();
  return (PRODUCTION_ORDER_STATUSES as string[]).includes(s) ? (s as ProductionOrderStatus) : null;
}

/** "SHIRT MAKER, TROUSER MAKER" -> ["SHIRT MAKER", "TROUSER MAKER"] */
export function splitJobTitles(raw: string | null | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export type ParsedTailorRow = {
  sourceRowId: number;
  name: string;
  jobTitles: string[];
  capacityRaw: string | null;
  totalWorkingHours: number;
  weeklyOffDay: string | null;
  monthlySalary: number;
  otherAllowance: number;
  visaExpense: number;
};

export type ParsedPriceListRow = {
  sourceRowId: number;
  item: string;
  unitPrice: number;
};

export type ParsedOrderRow = {
  sourceRowId: number;
  receivedDate: string | null;
  store: ProductionStore | null;
  storeRaw: string;
  invoiceNo: string;
  notes: string | null;
  itemRaw: string;
  qty: number;
  tailorNameRaw: string | null;
  deliveryDate: string | null;
  dispatchTime: string | null;
  scheduledDispatchDate: string | null;
  suggestedDispatchDate: string | null;
  possibleTime: string | null;
  status: ProductionOrderStatus | null;
  statusRaw: string;
  remarks: string | null;
};

export type ParseError = { sheet: string; row: number; message: string };

export type ParsedWorkbook = {
  tailors: ParsedTailorRow[];
  priceListItems: ParsedPriceListRow[];
  orders: ParsedOrderRow[];
  errors: ParseError[];
};

function rowsWithNumericFirstCol(sheet: XLSX.WorkSheet): unknown[][] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1, raw: true }) as unknown[][];
  return rows.filter((r) => Array.isArray(r) && typeof r[0] === "number");
}

export function parseProductionWorkbook(buffer: Buffer | ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const errors: ParseError[] = [];

  const dataSheet = wb.Sheets["data_sheet"];
  const tailorsSheet = wb.Sheets["tailors_data"];
  const priceSheet = wb.Sheets["price_list"];
  if (!dataSheet) errors.push({ sheet: "data_sheet", row: 0, message: "Sheet 'data_sheet' not found in workbook" });
  if (!tailorsSheet) errors.push({ sheet: "tailors_data", row: 0, message: "Sheet 'tailors_data' not found in workbook" });
  if (!priceSheet) errors.push({ sheet: "price_list", row: 0, message: "Sheet 'price_list' not found in workbook" });

  const tailors: ParsedTailorRow[] = [];
  if (tailorsSheet) {
    for (const r of rowsWithNumericFirstCol(tailorsSheet)) {
      const sourceRowId = r[0] as number;
      const name = normalizeItemText(r[1] as string);
      if (!name) {
        errors.push({ sheet: "tailors_data", row: sourceRowId, message: "Missing tailor name" });
        continue;
      }
      tailors.push({
        sourceRowId,
        name,
        jobTitles: splitJobTitles(r[2] as string),
        capacityRaw: r[3] ? String(r[3]) : null,
        totalWorkingHours: typeof r[4] === "number" ? r[4] : 8,
        weeklyOffDay: r[5] ? normalizeItemText(r[5] as string).toUpperCase() : null,
        monthlySalary: typeof r[6] === "number" ? r[6] : 0,
        otherAllowance: typeof r[7] === "number" ? r[7] : 0,
        visaExpense: typeof r[8] === "number" ? r[8] : 0,
      });
    }
  }

  const priceListItems: ParsedPriceListRow[] = [];
  if (priceSheet) {
    const seen = new Set<string>();
    for (const r of rowsWithNumericFirstCol(priceSheet)) {
      const sourceRowId = r[0] as number;
      const item = normalizeItemText(r[1] as string);
      if (!item) {
        errors.push({ sheet: "price_list", row: sourceRowId, message: "Missing item name" });
        continue;
      }
      const key = item.toUpperCase();
      if (seen.has(key)) continue; // harmless exact duplicates in the source (same item + price twice)
      seen.add(key);
      priceListItems.push({
        sourceRowId,
        item,
        unitPrice: typeof r[2] === "number" ? r[2] : 0,
      });
    }
  }

  const orders: ParsedOrderRow[] = [];
  if (dataSheet) {
    for (const r of rowsWithNumericFirstCol(dataSheet)) {
      const sourceRowId = r[0] as number;
      const itemRaw = normalizeItemText(r[5] as string);
      if (!itemRaw) {
        errors.push({ sheet: "data_sheet", row: sourceRowId, message: "Missing item" });
        continue;
      }
      const storeRaw = normalizeItemText(r[2] as string);
      const store = normalizeStore(storeRaw);
      if (!store) errors.push({ sheet: "data_sheet", row: sourceRowId, message: `Unrecognized store "${storeRaw}"` });

      const statusRaw = normalizeItemText(r[13] as string);
      const status = normalizeStatus(statusRaw);
      if (!status) errors.push({ sheet: "data_sheet", row: sourceRowId, message: `Unrecognized status "${statusRaw}"` });

      const receivedDate = parseSheetDate(r[1]);
      if (!receivedDate) errors.push({ sheet: "data_sheet", row: sourceRowId, message: "Unparseable Received Date" });

      orders.push({
        sourceRowId,
        receivedDate,
        store,
        storeRaw,
        invoiceNo: normalizeItemText(r[3] as string) || `ROW-${sourceRowId}`,
        notes: r[4] ? normalizeItemText(r[4] as string) : null,
        itemRaw,
        qty: typeof r[6] === "number" && r[6] > 0 ? r[6] : 1, // several rows carry qty in free-text Notes instead
        tailorNameRaw: r[7] ? normalizeItemText(r[7] as string).toUpperCase() : null,
        deliveryDate: parseSheetDate(r[8]),
        dispatchTime: parseSheetTime(r[9]),
        scheduledDispatchDate: parseSheetDate(r[10]),
        suggestedDispatchDate: parseSheetDate(r[11]),
        possibleTime: parseSheetTime(r[12]),
        status,
        statusRaw,
        remarks: r[14] ? normalizeItemText(r[14] as string) : null,
      });
    }
  }

  return { tailors, priceListItems, orders, errors };
}
