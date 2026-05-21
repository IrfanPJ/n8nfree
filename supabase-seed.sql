-- ============================================================
-- House of Tailors — Seed Data
-- Run in Supabase SQL Editor AFTER supabase-migrations.sql
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- ============================================================

-- ── 10 Customers ─────────────────────────────────────────────
INSERT INTO "Customer" (id, name, email, phone, address, city, gender, "isVIP", "isActive", tags, "createdAt", "updatedAt") VALUES
  ('seed-cust-001', 'Arjun Sharma',    'arjun@example.com',   '9876543210', '12 MG Road',        'Mumbai',    'MALE',   true,  true, ARRAY['suit','wedding']::text[],  NOW()-INTERVAL'60 days', NOW()),
  ('seed-cust-002', 'Priya Patel',     'priya@example.com',   '9876543211', '45 Park Street',    'Delhi',     'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'55 days', NOW()),
  ('seed-cust-003', 'Rohit Mehta',     'rohit@example.com',   '9876543212', '7 Linking Road',    'Mumbai',    'MALE',   false, true, ARRAY['ethnic']::text[],          NOW()-INTERVAL'50 days', NOW()),
  ('seed-cust-004', 'Sneha Joshi',     'sneha@example.com',   '9876543213', '22 Anna Salai',     'Chennai',   'FEMALE', true,  true, ARRAY['vip','wedding']::text[],   NOW()-INTERVAL'45 days', NOW()),
  ('seed-cust-005', 'Vikram Kapoor',   'vikram@example.com',  '9876543214', '88 Race Course Rd', 'Bangalore', 'MALE',   true,  true, ARRAY['wedding','suit']::text[],  NOW()-INTERVAL'40 days', NOW()),
  ('seed-cust-006', 'Anita Desai',     'anita@example.com',   '9876543215', '3 Civil Lines',     'Jaipur',    'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'35 days', NOW()),
  ('seed-cust-007', 'Rahul Singhania', 'rahul@example.com',   '9876543216', '56 Bandra West',    'Mumbai',    'MALE',   false, true, ARRAY['casual']::text[],          NOW()-INTERVAL'30 days', NOW()),
  ('seed-cust-008', 'Meera Nair',      'meera@example.com',   '9876543217', '19 Indiranagar',    'Bangalore', 'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'25 days', NOW()),
  ('seed-cust-009', 'Kabir Khan',      'kabir@example.com',   '9876543218', '4 Model Town',      'Delhi',     'MALE',   true,  true, ARRAY['vip','wedding']::text[],   NOW()-INTERVAL'20 days', NOW()),
  ('seed-cust-010', 'Divya Reddy',     'divya@example.com',   '9876543219', '31 Jubilee Hills',  'Hyderabad', 'FEMALE', false, true, ARRAY[]::text[],                  NOW()-INTERVAL'15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 10 Orders ────────────────────────────────────────────────
INSERT INTO "Order" (id, "orderNumber", "customerId", status, priority, "garmentType", "orderDate", "deliveryDate", "advanceAmount", "totalAmount", "isActive", "imageUrls", "createdAt", "updatedAt") VALUES
  ('seed-ord-001', 'HOT-2026-001', 'seed-cust-001', 'STITCHING', 'HIGH',   'Bespoke Suit',        NOW()-INTERVAL'30 days', NOW()+INTERVAL'5 days',  10000, 28000, true, ARRAY[]::text[], NOW()-INTERVAL'30 days', NOW()),
  ('seed-ord-002', 'HOT-2026-002', 'seed-cust-002', 'READY',     'NORMAL', 'Evening Gown',        NOW()-INTERVAL'25 days', NOW()+INTERVAL'2 days',   5000, 15000, true, ARRAY[]::text[], NOW()-INTERVAL'25 days', NOW()),
  ('seed-ord-003', 'HOT-2026-003', 'seed-cust-003', 'DELIVERED', 'NORMAL', 'Sherwani',            NOW()-INTERVAL'45 days', NOW()-INTERVAL'5 days',  12000, 32000, true, ARRAY[]::text[], NOW()-INTERVAL'45 days', NOW()),
  ('seed-ord-004', 'HOT-2026-004', 'seed-cust-004', 'TRIAL',     'HIGH',   'Wedding Lehenga',     NOW()-INTERVAL'20 days', NOW()+INTERVAL'10 days', 15000, 45000, true, ARRAY[]::text[], NOW()-INTERVAL'20 days', NOW()),
  ('seed-ord-005', 'HOT-2026-005', 'seed-cust-005', 'CUTTING',   'URGENT', 'Three-Piece Suit',    NOW()-INTERVAL'10 days', NOW()+INTERVAL'3 days',   8000, 35000, true, ARRAY[]::text[], NOW()-INTERVAL'10 days', NOW()),
  ('seed-ord-006', 'HOT-2026-006', 'seed-cust-006', 'PENDING',   'NORMAL', 'Salwar Kameez',       NOW()-INTERVAL'5 days',  NOW()+INTERVAL'20 days',  2000,  8000, true, ARRAY[]::text[], NOW()-INTERVAL'5 days',  NOW()),
  ('seed-ord-007', 'HOT-2026-007', 'seed-cust-007', 'MEASURING', 'LOW',    'Casual Shirts x3',    NOW()-INTERVAL'3 days',  NOW()+INTERVAL'14 days',  3000,  9000, true, ARRAY[]::text[], NOW()-INTERVAL'3 days',  NOW()),
  ('seed-ord-008', 'HOT-2026-008', 'seed-cust-008', 'STITCHING', 'NORMAL', 'Kurta Pajama',        NOW()-INTERVAL'8 days',  NOW()+INTERVAL'6 days',   2500,  6000, true, ARRAY[]::text[], NOW()-INTERVAL'8 days',  NOW()),
  ('seed-ord-009', 'HOT-2026-009', 'seed-cust-009', 'DELIVERED', 'HIGH',   'Reception Sherwani',  NOW()-INTERVAL'60 days', NOW()-INTERVAL'15 days', 20000, 55000, true, ARRAY[]::text[], NOW()-INTERVAL'60 days', NOW()),
  ('seed-ord-010', 'HOT-2026-010', 'seed-cust-010', 'READY',     'NORMAL', 'Office Suit',         NOW()-INTERVAL'15 days', NOW()+INTERVAL'1 days',   5000, 22000, true, ARRAY[]::text[], NOW()-INTERVAL'15 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Appointments ───────────────────────────────────────────
INSERT INTO "Appointment" (id, "customerId", title, status, type, "startTime", "endTime", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-appt-001', 'seed-cust-001', 'Final Fitting — Bespoke Suit',    'CONFIRMED', 'FITTING',      NOW()+INTERVAL'1 day 10 hours',  NOW()+INTERVAL'1 day 11 hours',  true, NOW()-INTERVAL'5 days', NOW()),
  ('seed-appt-002', 'seed-cust-004', 'Trial — Wedding Lehenga',         'SCHEDULED', 'TRIAL',        NOW()+INTERVAL'3 days 14 hours', NOW()+INTERVAL'3 days 15 hours', true, NOW()-INTERVAL'3 days', NOW()),
  ('seed-appt-003', 'seed-cust-007', 'Measurement Session',             'CONFIRMED', 'MEASUREMENT',  NOW()+INTERVAL'2 days 11 hours', NOW()+INTERVAL'2 days 12 hours', true, NOW()-INTERVAL'2 days', NOW()),
  ('seed-appt-004', 'seed-cust-002', 'Delivery — Evening Gown',         'SCHEDULED', 'DELIVERY',     NOW()+INTERVAL'2 days 16 hours', NOW()+INTERVAL'2 days 17 hours', true, NOW()-INTERVAL'1 day',  NOW()),
  ('seed-appt-005', 'seed-cust-005', 'Consultation — New Order',        'SCHEDULED', 'CONSULTATION', NOW()+INTERVAL'5 days 10 hours', NOW()+INTERVAL'5 days 11 hours', true, NOW(),                  NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Invoices ───────────────────────────────────────────────
INSERT INTO "Invoice" (id, "invoiceNumber", "customerId", "orderId", status, subtotal, "discountValue", "taxRate", "taxAmount", "totalAmount", "paidAmount", "dueAmount", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-inv-001', 'INV-2026-001', 'seed-cust-001', 'seed-ord-001', 'PARTIAL', 28000, 0, 18, 5040, 33040, 10000, 23040, true, NOW()-INTERVAL'30 days', NOW()),
  ('seed-inv-002', 'INV-2026-002', 'seed-cust-003', 'seed-ord-003', 'PAID',    32000, 2000, 18, 5400, 35400, 35400, 0,   true, NOW()-INTERVAL'45 days', NOW()),
  ('seed-inv-003', 'INV-2026-003', 'seed-cust-009', 'seed-ord-009', 'PAID',    55000, 5000, 18, 9000, 59000, 59000, 0,   true, NOW()-INTERVAL'60 days', NOW()),
  ('seed-inv-004', 'INV-2026-004', 'seed-cust-004', 'seed-ord-004', 'SENT',    45000, 0,    18, 8100, 53100, 15000, 38100,true, NOW()-INTERVAL'20 days', NOW()),
  ('seed-inv-005', 'INV-2026-005', 'seed-cust-006', NULL,           'OVERDUE',  8000, 0,    18, 1440,  9440,     0,  9440, true, NOW()-INTERVAL'60 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Follow-ups ─────────────────────────────────────────────
INSERT INTO "FollowUp" (id, "customerId", title, status, priority, "dueDate", "isActive", "createdAt", "updatedAt") VALUES
  ('seed-fu-001', 'seed-cust-002', 'Follow up on dress fitting',       'PENDING',     'NORMAL', NOW()+INTERVAL'2 days', true, NOW()-INTERVAL'5 days', NOW()),
  ('seed-fu-002', 'seed-cust-006', 'Chase payment — overdue invoice',  'PENDING',     'HIGH',   NOW()-INTERVAL'5 days', true, NOW()-INTERVAL'10 days',NOW()),
  ('seed-fu-003', 'seed-cust-007', 'Confirm shirt fabric selection',   'IN_PROGRESS', 'NORMAL', NOW()+INTERVAL'1 day',  true, NOW()-INTERVAL'3 days', NOW()),
  ('seed-fu-004', 'seed-cust-008', 'Send trial appointment reminder',  'PENDING',     'NORMAL', NOW()+INTERVAL'3 days', true, NOW()-INTERVAL'2 days', NOW()),
  ('seed-fu-005', 'seed-cust-010', 'Upsell — Office Blazer set',       'PENDING',     'LOW',    NOW()+INTERVAL'7 days', true, NOW(),                  NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Leads ──────────────────────────────────────────────────
INSERT INTO "Lead" (id, name, phone, email, interest, stage, value, source, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-lead-001', 'Suresh Iyengar', '9988776655', 'suresh@example.com',  'Wedding Sherwani', 'INTERESTED', 45000, 'Instagram', true, NOW()-INTERVAL'10 days', NOW()),
  ('seed-lead-002', 'Fatima Sheikh',  '9988776656', 'fatima@example.com',  'Bridal Lehenga',   'QUOTED',     85000, 'Referral',  true, NOW()-INTERVAL'7 days',  NOW()),
  ('seed-lead-003', 'Amit Trivedi',   '9988776657', NULL,                  'Corporate Suit',   'ENQUIRY',    30000, 'Walk-in',   true, NOW()-INTERVAL'5 days',  NOW()),
  ('seed-lead-004', 'Lakshmi Venkat', '9988776658', 'lakshmi@example.com', 'Saree Blouse',     'CLOSED_WON', 12000, 'Google',    true, NOW()-INTERVAL'20 days', NOW()),
  ('seed-lead-005', 'Dev Malhotra',   '9988776659', 'dev@example.com',     'Bespoke Suit Set', 'INTERESTED', 60000, 'Instagram', true, NOW()-INTERVAL'3 days',  NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 5 Fabrics ────────────────────────────────────────────────
INSERT INTO "Fabric" (id, name, type, color, "stockQty", "reorderLevel", supplier, "pricePerUnit", unit, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-fab-001', 'Italian Wool — Charcoal', 'Wool',     'Charcoal', 12, 5, 'Milano Textiles', 2500, 'm', true, NOW()-INTERVAL'60 days', NOW()),
  ('seed-fab-002', 'Navy Blue Linen',          'Linen',    'Navy Blue',18, 5, 'Kerala Weavers',  1200, 'm', true, NOW()-INTERVAL'55 days', NOW()),
  ('seed-fab-003', 'Raw Silk — Ivory',         'Silk',     'Ivory',     3, 8, 'Banaras Silk Co', 3800, 'm', true, NOW()-INTERVAL'45 days', NOW()),
  ('seed-fab-004', 'Egyptian Cotton — White',  'Cotton',   'White',    25,10, 'Cairo Exports',    800, 'm', true, NOW()-INTERVAL'40 days', NOW()),
  ('seed-fab-005', 'Cashmere Blend — Caramel', 'Cashmere', 'Caramel',   2, 5, 'Kashmir Looms',  5500, 'm', true, NOW()-INTERVAL'30 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 12 POS Products ──────────────────────────────────────────
INSERT INTO "Product" (id, name, price, category, "isActive", "createdAt", "updatedAt") VALUES
  ('seed-prod-001', 'Suit (Bespoke)',      25000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-002', 'Blazer',             12000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-003', 'Sherwani (Bespoke)', 30000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-004', 'Kurta Pajama',        5000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-005', 'Nehru Jacket',        8000, 'Ethnic',   true, NOW(), NOW()),
  ('seed-prod-006', 'Dress Shirt',         3500, 'Shirts',   true, NOW(), NOW()),
  ('seed-prod-007', 'Formal Trousers',     4500, 'Trousers', true, NOW(), NOW()),
  ('seed-prod-008', 'Waistcoat',           6000, 'Suits',    true, NOW(), NOW()),
  ('seed-prod-009', 'Alteration',           500, 'Services', true, NOW(), NOW()),
  ('seed-prod-010', 'Dry Cleaning',         800, 'Services', true, NOW(), NOW()),
  ('seed-prod-011', 'Fabric (per metre)',  1200, 'Fabric',   true, NOW(), NOW()),
  ('seed-prod-012', 'Monogram Embroidery', 1500, 'Services', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
