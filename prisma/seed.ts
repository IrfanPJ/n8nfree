import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@houseoftailors.com" },
    update: {},
    create: {
      email: "admin@houseoftailors.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 12);
  const tailor = await prisma.user.upsert({
    where: { email: "tailor@houseoftailors.com" },
    update: {},
    create: {
      email: "tailor@houseoftailors.com",
      name: "Master Tailor",
      password: staffPassword,
      role: "TAILOR",
      isActive: true,
    },
  });

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: "customer-1" },
      update: {},
      create: {
        id: "customer-1",
        name: "Rajesh Kumar",
        phone: "+91 98765 43210",
        email: "rajesh@example.com",
        city: "Mumbai",
        gender: "MALE",
        isVIP: true,
        tags: ["premium", "wedding"],
        notes: "Prefers slim fit. Has been a customer for 5 years.",
      },
    }),
    prisma.customer.upsert({
      where: { id: "customer-2" },
      update: {},
      create: {
        id: "customer-2",
        name: "Priya Sharma",
        phone: "+91 87654 32109",
        email: "priya@example.com",
        city: "Delhi",
        gender: "FEMALE",
        isVIP: true,
        tags: ["bridal", "premium"],
        notes: "Bridal customer. Prefers traditional designs.",
      },
    }),
    prisma.customer.upsert({
      where: { id: "customer-3" },
      update: {},
      create: {
        id: "customer-3",
        name: "Arun Nair",
        phone: "+91 76543 21098",
        email: "arun@example.com",
        city: "Bangalore",
        gender: "MALE",
        isVIP: false,
        tags: ["corporate"],
        notes: "Corporate client. Orders suits regularly.",
      },
    }),
    prisma.customer.upsert({
      where: { id: "customer-4" },
      update: {},
      create: {
        id: "customer-4",
        name: "Meera Patel",
        phone: "+91 65432 10987",
        city: "Ahmedabad",
        gender: "FEMALE",
        isVIP: false,
        notes: "New customer. Referred by Rajesh Kumar.",
      },
    }),
  ]);

  // Create measurements for customers
  await prisma.measurement.upsert({
    where: { id: "measurement-1" },
    update: {},
    create: {
      id: "measurement-1",
      customerId: customers[0].id,
      label: "Standard",
      chest: 42,
      waist: 36,
      hip: 40,
      shoulder: 18,
      neck: 15.5,
      sleeve: 25,
      inseam: 30,
      unit: "inches",
      notes: "Slightly broad shoulders. Needs 0.5 inch extra on chest.",
      takenBy: admin.name,
    },
  });

  await prisma.measurement.upsert({
    where: { id: "measurement-2" },
    update: {},
    create: {
      id: "measurement-2",
      customerId: customers[1].id,
      label: "Bridal",
      chest: 36,
      waist: 28,
      hip: 38,
      shoulder: 14,
      sleeve: 22,
      unit: "inches",
      notes: "For bridal lehenga blouse fitting.",
      takenBy: admin.name,
    },
  });

  // Create sample orders
  const order1 = await prisma.order.upsert({
    where: { id: "order-1" },
    update: {},
    create: {
      id: "order-1",
      orderNumber: "HOT-KLP4Z-ABC",
      customerId: customers[0].id,
      assignedToId: tailor.id,
      status: "STITCHING",
      priority: "HIGH",
      garmentType: "Three-Piece Suit",
      fabricName: "Italian Wool",
      fabricColor: "Charcoal Grey",
      fabricQuantity: 3.5,
      orderDate: new Date("2024-12-01"),
      deliveryDate: new Date("2024-12-20"),
      totalAmount: 35000,
      advanceAmount: 15000,
      designNotes: "Slim fit with peak lapels. No vent. Contrast lining.",
      notes: "Rush order for client's daughter's wedding.",
    },
  });

  const order2 = await prisma.order.upsert({
    where: { id: "order-2" },
    update: {},
    create: {
      id: "order-2",
      orderNumber: "HOT-KLP4Z-DEF",
      customerId: customers[1].id,
      status: "TRIAL",
      priority: "URGENT",
      garmentType: "Bridal Lehenga Blouse",
      fabricName: "Silk Brocade",
      fabricColor: "Red and Gold",
      fabricQuantity: 1.5,
      orderDate: new Date("2024-12-05"),
      deliveryDate: new Date("2024-12-18"),
      totalAmount: 45000,
      advanceAmount: 25000,
      designNotes: "Heavy embroidery on back and sleeves. Deep neck front.",
    },
  });

  const order3 = await prisma.order.upsert({
    where: { id: "order-3" },
    update: {},
    create: {
      id: "order-3",
      orderNumber: "HOT-KLP4Z-GHI",
      customerId: customers[2].id,
      status: "READY",
      priority: "NORMAL",
      garmentType: "Business Suit",
      fabricName: "Premium Wool Blend",
      fabricColor: "Navy Blue",
      fabricQuantity: 3,
      orderDate: new Date("2024-11-25"),
      deliveryDate: new Date("2024-12-10"),
      totalAmount: 28000,
      advanceAmount: 10000,
    },
  });

  // Create sample invoices
  const invoice1 = await prisma.invoice.upsert({
    where: { id: "invoice-1" },
    update: {},
    create: {
      id: "invoice-1",
      invoiceNumber: "INV-2024-A1B2",
      customerId: customers[0].id,
      orderId: order1.id,
      status: "PARTIAL",
      subtotal: 35000,
      taxRate: 18,
      taxAmount: 6300,
      totalAmount: 41300,
      paidAmount: 15000,
      dueAmount: 26300,
      dueDate: new Date("2024-12-20"),
      items: {
        create: [
          {
            description: "Three-Piece Suit — Italian Wool",
            quantity: 1,
            unitPrice: 35000,
            amount: 35000,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.upsert({
    where: { id: "invoice-2" },
    update: {},
    create: {
      id: "invoice-2",
      invoiceNumber: "INV-2024-C3D4",
      customerId: customers[2].id,
      orderId: order3.id,
      status: "PAID",
      subtotal: 28000,
      taxRate: 18,
      taxAmount: 5040,
      totalAmount: 33040,
      paidAmount: 33040,
      dueAmount: 0,
      items: {
        create: [
          {
            description: "Business Suit — Premium Wool Blend",
            quantity: 1,
            unitPrice: 28000,
            amount: 28000,
          },
        ],
      },
    },
  });

  // Record payment
  await prisma.payment.upsert({
    where: { id: "payment-1" },
    update: {},
    create: {
      id: "payment-1",
      invoiceId: invoice2.id,
      amount: 33040,
      method: "UPI",
      reference: "UPI123456789",
      notes: "Full payment received",
    },
  });

  // Create appointments
  await prisma.appointment.upsert({
    where: { id: "appointment-1" },
    update: {},
    create: {
      id: "appointment-1",
      customerId: customers[1].id,
      staffId: tailor.id,
      title: "Bridal Fitting - Final Trial",
      type: "TRIAL",
      status: "CONFIRMED",
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      notes: "Final trial before delivery. Family will be present.",
    },
  });

  await prisma.appointment.upsert({
    where: { id: "appointment-2" },
    update: {},
    create: {
      id: "appointment-2",
      customerId: customers[0].id,
      title: "Measurement - New Order",
      type: "MEASUREMENT",
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    },
  });

  // Create follow-ups
  await prisma.followUp.upsert({
    where: { id: "followup-1" },
    update: {},
    create: {
      id: "followup-1",
      customerId: customers[3].id,
      staffId: admin.id,
      title: "First purchase follow-up",
      description: "Check satisfaction after first order. Offer 10% discount on next purchase.",
      status: "PENDING",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Create suppliers
  const supplier = await prisma.supplier.upsert({
    where: { id: "supplier-1" },
    update: {},
    create: {
      id: "supplier-1",
      name: "Mumbai Fabric House",
      phone: "+91 22 1234 5678",
      email: "orders@mumbaifabric.com",
      address: "Dharavi, Mumbai",
    },
  });

  // Create purchases
  await prisma.purchase.upsert({
    where: { id: "purchase-1" },
    update: {},
    create: {
      id: "purchase-1",
      supplierId: supplier.id,
      itemName: "Italian Wool Fabric",
      category: "FABRIC",
      quantity: 50,
      unit: "meters",
      unitPrice: 800,
      totalAmount: 40000,
      paidAmount: 40000,
      purchaseDate: new Date("2024-11-15"),
      notes: "High quality imported wool",
    },
  });

  // Create notifications
  await prisma.notification.upsert({
    where: { id: "notif-1" },
    update: {},
    create: {
      id: "notif-1",
      userId: admin.id,
      type: "ORDER_STATUS",
      title: "Order Ready for Delivery",
      message: "Order HOT-KLP4Z-GHI for Arun Nair is ready for delivery.",
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif-2" },
    update: {},
    create: {
      id: "notif-2",
      userId: admin.id,
      type: "PAYMENT",
      title: "Payment Received",
      message: "Full payment of ₹33,040 received from Arun Nair via UPI.",
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif-3" },
    update: {},
    create: {
      id: "notif-3",
      userId: admin.id,
      type: "APPOINTMENT",
      title: "Appointment Tomorrow",
      message: "Rajesh Kumar has a measurement appointment tomorrow at 10:00 AM.",
      isRead: true,
    },
  });

  // Create activity logs
  await prisma.activityLog.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "log-1",
        userId: admin.id,
        customerId: customers[0].id,
        orderId: order1.id,
        action: "CREATE",
        entity: "Order",
        entityId: order1.id,
        description: `Order ${order1.orderNumber} created for ${customers[0].name}`,
      },
      {
        id: "log-2",
        userId: tailor.id,
        orderId: order1.id,
        action: "UPDATE",
        entity: "Order",
        entityId: order1.id,
        description: `Order ${order1.orderNumber} moved to STITCHING status`,
      },
      {
        id: "log-3",
        userId: admin.id,
        customerId: customers[2].id,
        orderId: order3.id,
        action: "UPDATE",
        entity: "Order",
        entityId: order3.id,
        description: `Order ${order3.orderNumber} is READY for delivery`,
      },
      {
        id: "log-4",
        userId: admin.id,
        customerId: customers[3].id,
        action: "CREATE",
        entity: "Customer",
        entityId: customers[3].id,
        description: `New customer ${customers[3].name} added`,
      },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log("\nDemo credentials:");
  console.log("  Admin: admin@houseoftailors.com / admin123");
  console.log("  Tailor: tailor@houseoftailors.com / staff123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
