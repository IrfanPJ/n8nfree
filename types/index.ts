import type {
  User,
  Customer,
  Measurement,
  Order,
  OrderHistory,
  Appointment,
  Invoice,
  InvoiceItem,
  Payment,
  FollowUp,
  Supplier,
  Purchase,
  Notification,
  ActivityLog,
  UserRole,
  Gender,
  OrderStatus,
  OrderPriority,
  AppointmentStatus,
  InvoiceStatus,
  FollowUpStatus,
  PaymentMethod,
  NotificationType,
} from "@prisma/client";

export type {
  User,
  Customer,
  Measurement,
  Order,
  OrderHistory,
  Appointment,
  Invoice,
  InvoiceItem,
  Payment,
  FollowUp,
  Supplier,
  Purchase,
  Notification,
  ActivityLog,
  UserRole,
  Gender,
  OrderStatus,
  OrderPriority,
  AppointmentStatus,
  InvoiceStatus,
  FollowUpStatus,
  PaymentMethod,
  NotificationType,
};

export type CustomerWithRelations = Customer & {
  measurements: Measurement[];
  orders: Order[];
  appointments: Appointment[];
  invoices: Invoice[];
  followUps: FollowUp[];
  _count?: {
    orders: number;
    measurements: number;
    appointments: number;
    invoices: number;
    followUps: number;
  };
};

export type OrderWithRelations = Order & {
  customer: Customer;
  assignedTo?: User | null;
  invoice?: Invoice | null;
  statusHistory: OrderHistory[];
};

export type AppointmentWithRelations = Appointment & {
  customer: Customer;
  staff?: User | null;
};

export type InvoiceWithRelations = Invoice & {
  customer: Customer;
  order?: Order | null;
  items: InvoiceItem[];
  payments: Payment[];
};

export type FollowUpWithRelations = FollowUp & {
  customer: Customer;
  staff?: User | null;
};

export type PurchaseWithRelations = Purchase & {
  supplier?: Supplier | null;
};

export type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  newCustomers: number;
  todayAppointments: number;
  upcomingDeliveries: number;
  overdueInvoices: number;
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
};

export type RevenueData = {
  month: string;
  revenue: number;
  orders: number;
};

export type OrderStatusData = {
  status: string;
  count: number;
  color: string;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type SearchResult = {
  type: "customer" | "order" | "invoice" | "appointment";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    role?: string;
  }
}
