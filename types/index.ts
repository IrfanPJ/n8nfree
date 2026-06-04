// ── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = "ADMIN" | "MANAGER" | "STAFF";
export type StaffPosition =
  | "SALES_STAFF"
  | "PURCHASE_STAFF"
  | "PRODUCTION_IN_CHARGE"
  | "MASTER"
  | "TAILOR"
  | "QUALITY_CHECK"
  | "LOGISTICS_COORDINATOR"
  | "LEAD_MANAGEMENT_STAFF";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type OrderStatus =
  | "MEASUREMENT"
  | "FABRIC_ORDERING"
  | "FABRIC_COLLECTED"
  | "CUTTING"
  | "SEMI_STITCH"
  | "TRIAL"
  | "FINAL_STITCH"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "PENDING_ALTERATION"
  | "READY_FINAL_DELIVERY"
  | "ORDER_CLOSED";
export type OrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type AppointmentStatus =
  | "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
export type FollowUpStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export type NotificationType =
  | "ORDER_STATUS" | "APPOINTMENT" | "PAYMENT" | "FOLLOWUP" | "SYSTEM" | "DELIVERY";

// ── Models ───────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
  password: string | null;
  role: UserRole;
  position: StaffPosition | null;
  pagePermissions: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  gender: Gender;
  dateOfBirth: string | null;
  notes: string | null;
  tags: string[];
  isVIP: boolean;
  isActive: boolean;
  branch: string;
  createdAt: string;
  updatedAt: string;
};

export type Measurement = {
  id: string;
  customerId: string;
  label: string;
  chest: number | null;
  waist: number | null;
  hip: number | null;
  shoulder: number | null;
  neck: number | null;
  sleeve: number | null;
  armhole: number | null;
  inseam: number | null;
  outseam: number | null;
  rise: number | null;
  thigh: number | null;
  ankle: number | null;
  backLength: number | null;
  frontLength: number | null;
  jacketLength: number | null;
  shirtLength: number | null;
  unit: string;
  notes: string | null;
  takenAt: string;
  takenBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  assignedToId: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  garmentType: string;
  garmentDetails: string | null;
  fabricName: string | null;
  fabricCode: string | null;
  fabricColor: string | null;
  fabricQuantity: number | null;
  designNotes: string | null;
  imageUrls: string[];
  orderDate: string;
  deliveryDate: string;
  trialDate: string | null;
  advanceAmount: number;
  totalAmount: number;
  notes: string | null;
  cancelReason: string | null;
  isActive: boolean;
  branch: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderHistory = {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes: string | null;
  changedBy: string | null;
  changedAt: string;
};

export type Appointment = {
  id: string;
  customerId: string;
  staffId: string | null;
  title: string;
  description: string | null;
  status: AppointmentStatus;
  type: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  reminderAt: string | null;
  isActive: boolean;
  branch: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discountType: string | null;
  discountValue: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  createdAt: string;
};

export type FollowUp = {
  id: string;
  customerId: string;
  staffId: string | null;
  title: string;
  description: string | null;
  status: FollowUpStatus;
  priority: OrderPriority;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Purchase = {
  id: string;
  supplierId: string | null;
  itemName: string;
  itemCode: string | null;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  userId: string | null;
  customerId: string | null;
  orderId: string | null;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type LeadStage = "ENQUIRY" | "INTERESTED" | "QUOTED" | "APPOINTMENT_CONFIRMED" | "CLOSED_WON" | "CLOSED_LOST" | "IRRELEVANT" | "NO_REPLY";

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interest: string | null;
  stage: LeadStage;
  notes: string | null;
  value: number;
  source: string | null;
  category: string | null;
  handler: string | null;
  transferredTo: string | null;
  visited: boolean;
  followup: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Fabric = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  stockQty: number;
  reorderLevel: number;
  supplier: string | null;
  pricePerUnit: number;
  unit: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type POSProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
};

export type POSCartItem = POSProduct & { qty: number };

export type POSSale = {
  id: string;
  receiptNo: string;
  clientName: string | null;
  items: POSCartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "CASH" | "CARD";
  createdAt: string;
};

// ── Relation types ────────────────────────────────────────────────────────────
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

export type OrderItem = {
  id: string;
  orderId: string;
  garmentType: string;
  quantity: number;
  unitPrice: number;
  assignedToId: string | null;
  assignedTo?: Pick<User, "id" | "name" | "role"> | null;
  notes: string | null;
  sortOrder: number;
  fabricName: string | null;
  fabricColor: string | null;
  createdAt: string;
};

export type OrderWithRelations = Order & {
  customer: Customer;
  assignedTo?: User | null;
  invoice?: Invoice | null;
  statusHistory: OrderHistory[];
  items: OrderItem[];
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
  staff?: Pick<User, "id" | "name"> | null;
};

export type PurchaseWithRelations = Purchase & {
  supplier?: Supplier | null;
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
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
  // POS
  posSalesToday: number;
  posRevenueToday: number;
  totalPOSRevenue: number;
  // Leads
  activeLeads: number;
  closedWonLeads: number;
  pipelineValue: number;
  // Fabrics
  lowStockFabrics: number;
  totalFabrics: number;
  // Follow-ups
  pendingFollowUps: number;
  overdueFollowUps: number;
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
  nextCursor?: string | null;
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
      pagePermissions?: string[] | null;
    };
  }

  interface User {
    role?: string;
    pagePermissions?: string[] | null;
  }
}
