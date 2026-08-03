-- Users table backing /api/v1/auth login/logout.
-- Passwords are stored as bcrypt hashes (see auth.controller.js); tokens are
-- opaque session tokens with a 1-hour TTL enforced via "tokenExpiresAt".

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "userName" VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    token TEXT,
    "tokenExpiresAt" TIMESTAMPTZ
);

-- Locations master, backing /api/v1/locations CRUD.
CREATE TABLE IF NOT EXISTS ims_location (
    id SERIAL PRIMARY KEY,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_location_location_lower_idx ON ims_location (LOWER(location));

-- Categories master, backing /api/v1/categories CRUD.
CREATE TABLE IF NOT EXISTS ims_category (
    id SERIAL PRIMARY KEY,
    category VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_category_category_lower_idx ON ims_category (LOWER(category));

-- Product types master, backing /api/v1/product-types CRUD.
CREATE TABLE IF NOT EXISTS ims_product_type (
    id SERIAL PRIMARY KEY,
    "productType" VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active'
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_product_type_lower_idx ON ims_product_type (LOWER("productType"));

-- Vendors master, backing /api/v1/vendors CRUD.
CREATE TABLE IF NOT EXISTS ims_vendor (
    id SERIAL PRIMARY KEY,
    "vendorName" VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    "phoneNumber" VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    "zipCode" VARCHAR(20)
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_vendor_vendorname_lower_idx ON ims_vendor (LOWER("vendorName"));

-- Raw SKU master, backing /api/v1/raw-skus CRUD. "rawMaterialId" self-references this same
-- table (a "Processed" SKU can point at a parent raw material, e.g. Door Stopper <- Steel Rod).
-- inventoryEntryMode/sourceType/rawMaterialId are stored as real data but not wired into any
-- automatic stock-recalculation logic yet - there's no transaction pipeline today that would
-- update currentStock automatically (InventoryHome is still its own mock world).
CREATE TABLE IF NOT EXISTS ims_raw_sku (
    id SERIAL PRIMARY KEY,
    "skuCode" VARCHAR(50) NOT NULL UNIQUE,
    "skuName" VARCHAR(150) NOT NULL,
    "categoryId" INTEGER REFERENCES ims_category(id),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "inventoryEntryMode" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "sourceType" VARCHAR(30) NOT NULL DEFAULT 'Direct Purchase',
    "rawMaterialId" INTEGER REFERENCES ims_raw_sku(id),
    "minStock" NUMERIC NOT NULL DEFAULT 0,
    "maxStock" NUMERIC NOT NULL DEFAULT 0,
    "reorderLevel" NUMERIC NOT NULL DEFAULT 0,
    "openingStock" NUMERIC NOT NULL DEFAULT 0,
    "currentStock" NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase orders, backing /api/v1/purchase-orders CRUD.
-- "items" is a JSONB array of raw-material lines, each shaped like:
-- { skuId, skuCode, itemName, category, unit, orderedQty, receivedQty, pendingQty,
--   unitPrice, discountPercent, discountAmount, gstPercent, gstAmount, lineTotal, remarks }
-- All numeric totals (subTotal/discountAmount/gstAmount/grandTotal/etc.) are computed
-- client-side from "items" and persisted as-sent, same trust model as every other
-- computed total in this app (e.g. Material Inward's totals).
CREATE TABLE IF NOT EXISTS ims_purchase_order (
    id SERIAL PRIMARY KEY,
    "poNo" VARCHAR(50) NOT NULL UNIQUE,
    "vendorId" INTEGER NOT NULL REFERENCES ims_vendor(id),
    "poDate" DATE NOT NULL,
    "expectedDeliveryDate" DATE,
    "deliveryAddress" TEXT,
    "paymentTerms" VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    items JSONB NOT NULL DEFAULT '[]',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" NUMERIC NOT NULL DEFAULT 0,
    "subTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discountAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "gstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "grandTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    "createdBy" VARCHAR(150),
    "approvedBy" VARCHAR(150),
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ims_purchase_order already existed live before "deliveryAddress" was added to the
-- CREATE TABLE block above, so this migrates any already-created table too.
ALTER TABLE ims_purchase_order ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
-- freightCharge/otherCharges were dropped from Purchase Order (Material Inward has its
-- own, unrelated freightCharge/otherCharges columns on ims_material_inward - not touched).
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS "freightCharge";
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS "otherCharges";
-- "Approved" was removed as a selectable status (Sent now plays that "locked, awaiting
-- receipt" role instead) - migrate any existing rows so they stay consistent with the
-- new Draft -> Sent -> Received/Cancelled lifecycle.
UPDATE ims_purchase_order SET status = 'Sent' WHERE status = 'Approved';

-- Material inwards, backing /api/v1/material-inwards CRUD.
-- "items" is a JSONB array of raw-material lines, each shaped like:
-- { skuId, skuCode, itemName, unit, orderedQty, previousReceivedQty, receivedQty,
--   pendingQty, acceptedQty, rejectedQty, unitPrice, discountPercent, discountAmount,
--   gstPercent, gstAmount, lineTotal, batchNo, expiryDate, remarks }
-- Unlike ims_purchase_order (which joins ims_vendor for vendorName), "vendorName" and
-- "purchaseOrderNo" are stored directly here (denormalized, set by the frontend when the
-- vendor/PO is picked) since the schema was specified that way.
CREATE TABLE IF NOT EXISTS ims_material_inward (
    id SERIAL PRIMARY KEY,
    "inwardNo" VARCHAR(50) NOT NULL UNIQUE,
    "purchaseOrderId" INTEGER REFERENCES ims_purchase_order(id),
    "purchaseOrderNo" VARCHAR(50),
    "vendorId" INTEGER NOT NULL REFERENCES ims_vendor(id),
    "vendorName" VARCHAR(150) NOT NULL,
    "receivedDate" DATE NOT NULL,
    "invoiceNo" VARCHAR(100),
    "invoiceDate" DATE,
    "challanNo" VARCHAR(100),
    "vehicleNo" VARCHAR(50),
    "warehouseId" INTEGER NOT NULL REFERENCES ims_location(id),
    items JSONB NOT NULL DEFAULT '[]',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" NUMERIC NOT NULL DEFAULT 0,
    "subTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discountAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "gstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "freightCharge" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "otherCharges" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "grandTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    "receivedBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices, backing /api/v1/invoices CRUD. Auto-generated once (create-only) whenever a
-- Material Inward is saved (see materialInward.controller.js's createInvoiceFromMaterialInward);
-- after that it's an independently-editable financial record, never overwritten by later
-- Material Inward edits/deletes. No line items - this is a header-only aggregate document.
CREATE TABLE IF NOT EXISTS ims_invoices (
    id SERIAL PRIMARY KEY,
    "invoiceNo" VARCHAR(50) NOT NULL UNIQUE,
    "invoiceDate" DATE NOT NULL,
    "invoiceType" VARCHAR(30) NOT NULL DEFAULT 'Purchase',
    "referenceNo" VARCHAR(50),
    "materialInwardNo" VARCHAR(50),
    "customerSupplier" VARCHAR(150),
    location VARCHAR(150),
    "totalQty" NUMERIC NOT NULL DEFAULT 0,
    "subTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "unitPrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discountPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "discountAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "gstPercent" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "gstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "freightCharge" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "otherCharges" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "grandTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "dueAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "paymentTerms" VARCHAR(50),
    "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    remarks TEXT,
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "invoiceStatus" (Draft/Generated/Sent/Cancelled) was removed - Payment Status
-- (Unpaid/Partial/Paid) is the invoice's only status field now.
ALTER TABLE ims_invoices DROP COLUMN IF EXISTS "invoiceStatus";
