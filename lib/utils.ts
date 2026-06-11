import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "AED"): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, h:mm a");
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `HOT-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `INV-${year}-${timestamp}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export const ORDER_STATUS_CONFIG = {
  MEASUREMENT:        { label: "Measurement",        color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20" },
  FABRIC_ORDERING:    { label: "Fabric Ordering",    color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20" },
  FABRIC_COLLECTED:   { label: "Fabric Collected",   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20" },
  CUTTING:            { label: "Cutting",             color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20" },
  SEMI_STITCH:        { label: "Semi Stitch",         color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20" },
  TRIAL:              { label: "Trial",               color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20" },
  FINAL_STITCH:       { label: "Final Stitch",        color: "text-indigo-400",  bg: "bg-indigo-400/10",  border: "border-indigo-400/20" },
  READY_FOR_DELIVERY: { label: "Ready for Delivery",  color: "text-green-400",   bg: "bg-green-400/10",   border: "border-green-400/20" },
  DELIVERED:          { label: "Delivered",           color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  PENDING_ALTERATION: { label: "Pending Alteration",  color: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-400/20" },
  READY_FINAL_DELIVERY:{ label: "Ready Final Delivery",color: "text-teal-400",   bg: "bg-teal-400/10",    border: "border-teal-400/20" },
  ORDER_CLOSED:       { label: "Order Closed",        color: "text-gray-400",    bg: "bg-gray-400/10",    border: "border-gray-400/20" },
} as const;

export const INVOICE_STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "text-gray-400", bg: "bg-gray-400/10" },
  SENT: { label: "Sent", color: "text-blue-400", bg: "bg-blue-400/10" },
  PARTIAL: { label: "Partial", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  PAID: { label: "Paid", color: "text-green-400", bg: "bg-green-400/10" },
  OVERDUE: { label: "Overdue", color: "text-red-400", bg: "bg-red-400/10" },
  CANCELLED: { label: "Cancelled", color: "text-gray-400", bg: "bg-gray-400/10" },
} as const;

export const APPOINTMENT_STATUS_CONFIG = {
  SCHEDULED: { label: "Scheduled", color: "text-blue-400", bg: "bg-blue-400/10" },
  CONFIRMED: { label: "Confirmed", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  IN_PROGRESS: { label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  COMPLETED: { label: "Completed", color: "text-green-400", bg: "bg-green-400/10" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10" },
  NO_SHOW: { label: "No Show", color: "text-gray-400", bg: "bg-gray-400/10" },
} as const;

export function openWhatsApp(phone: string, message: string): void {
  const cleaned = phone.replace(/\D/g, "");
  const num = cleaned.startsWith("91") || cleaned.startsWith("0") ? cleaned : `91${cleaned}`;
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  VIP:     { label: "VIP",     color: "text-purple-400" },
  REGULAR: { label: "Regular", color: "text-gray-400" },
  URGENT:  { label: "Urgent",  color: "text-red-400" },
  // legacy values — kept for follow-up module and graceful display
  LOW:     { label: "Low",     color: "text-gray-400" },
  NORMAL:  { label: "Normal",  color: "text-gray-400" },
  HIGH:    { label: "High",    color: "text-amber-400" },
};

export function displayOrderNumber(order: { customOrderNumber?: string | null; orderNumber: string }): string {
  return order.customOrderNumber || order.orderNumber;
}

export const PAYMENT_METHOD_CONFIG: Record<string, { label: string }> = {
  CASH:         { label: "Cash" },
  CARD:         { label: "Card Payment" },
  BANK_TRANSFER:{ label: "Bank Transfer" },
  PAYMENT_LINK: { label: "Payment Link" },
  OTHER:        { label: "Others" },
  UPI:          { label: "UPI" },
  CHEQUE:       { label: "Cheque" },
};
