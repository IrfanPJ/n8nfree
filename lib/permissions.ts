export const PAGE_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "scan", label: "QR Scanner" },
  { key: "pos", label: "Sales / POS" },
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Client Book" },
  { key: "appointments", label: "Appointments" },
  { key: "measurements", label: "Measurements" },
  { key: "invoices", label: "Invoices" },
  { key: "fabrics", label: "Fabrics" },
  { key: "leads", label: "Leads" },
  { key: "followups", label: "Follow-ups" },
  { key: "purchases", label: "Purchases" },
  { key: "finance", label: "Finance" },
  { key: "ai-assistant", label: "AI Assistant" },
  { key: "activity", label: "Activity Log" },
  { key: "notifications", label: "Notifications" },
] as const;

export type PageKey = (typeof PAGE_PERMISSIONS)[number]["key"];

export function hasPageAccess(
  pageKey: string,
  pagePermissions: string[] | null | undefined,
  role: string
): boolean {
  if (role === "ADMIN" || role === "MANAGER") return true;
  if (!pagePermissions) return false; // null = no permissions granted yet
  return pagePermissions.includes(pageKey);
}
