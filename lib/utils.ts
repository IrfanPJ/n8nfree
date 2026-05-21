import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
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
  PENDING: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  MEASURING: { label: "Measuring", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  CUTTING: { label: "Cutting", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  STITCHING: { label: "Stitching", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  TRIAL: { label: "Trial", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
  READY: { label: "Ready", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20" },
  DELIVERED: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
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

export const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "text-gray-400" },
  NORMAL: { label: "Normal", color: "text-blue-400" },
  HIGH: { label: "High", color: "text-yellow-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
} as const;
