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
    "freightCharge" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "otherCharges" NUMERIC(12,2) NOT NULL DEFAULT 0,
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
