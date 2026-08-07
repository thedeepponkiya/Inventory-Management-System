-- Users table backing /api/v1/auth login/logout AND /api/v1/users management CRUD.
-- Passwords are stored as bcrypt hashes (see auth.controller.js/user.controller.js); tokens
-- are opaque session tokens with a 1-hour TTL enforced via "tokenExpiresAt".
-- "userName" is kept as the internal column name (CRM notes/followups/leads join on it via
-- "userName" AS "assignedToName"/"createdByName") - the User Management API exposes it as
-- "fullName" via a SELECT alias instead of renaming the column, to avoid touching every CRM
-- join that already depends on this name.
-- "roleId"/"departmentId" hold a plain string picked from a fixed frontend dropdown list
-- (no Roles/Departments master table exists), not a numeric foreign key - named to match the
-- field list the User Management feature was speced against.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "userName" VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    token TEXT,
    "tokenExpiresAt" TIMESTAMPTZ
);
-- users already existed live with a "password" column before it was renamed - migrate any
-- already-created table too (same pattern used elsewhere for evolved tables).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
        ALTER TABLE users RENAME COLUMN password TO "passwordHash";
    END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "userCode" VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "roleId" VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "departmentId" VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileImage" TEXT;
ALTER TABLE users DROP COLUMN IF EXISTS "locationId";
CREATE UNIQUE INDEX IF NOT EXISTS users_usercode_lower_idx ON users (LOWER("userCode"));

-- Locations master, backing /api/v1/locations CRUD.
CREATE TABLE IF NOT EXISTS ims_location (
    id SERIAL PRIMARY KEY,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_location_location_lower_idx ON ims_location (LOWER(location));
-- ims_location already existed live before "createdAt" was added to the CREATE TABLE block
-- above, so this migrates any already-created table too (same pattern used by ims_raw_sku).
ALTER TABLE ims_location ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Categories master, backing /api/v1/categories CRUD.
CREATE TABLE IF NOT EXISTS ims_category (
    id SERIAL PRIMARY KEY,
    category VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_category_category_lower_idx ON ims_category (LOWER(category));
ALTER TABLE ims_category ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Product types master, backing /api/v1/product-types CRUD.
CREATE TABLE IF NOT EXISTS ims_product_type (
    id SERIAL PRIMARY KEY,
    "productType" VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_product_type_lower_idx ON ims_product_type (LOWER("productType"));
ALTER TABLE ims_product_type ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

-- Units of measure master, backing /api/v1/units CRUD.
CREATE TABLE IF NOT EXISTS ims_unit (
    id SERIAL PRIMARY KEY,
    unit VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_unit_lower_idx ON ims_unit (LOWER(unit));

-- Vendors master, backing /api/v1/vendors CRUD.
CREATE TABLE IF NOT EXISTS ims_vendor (
    id SERIAL PRIMARY KEY,
    "vendorName" VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    "phoneNumber" VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    "zipCode" VARCHAR(20),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_vendor_vendorname_lower_idx ON ims_vendor (LOWER("vendorName"));
ALTER TABLE ims_vendor ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

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
    "productTypeId" INTEGER REFERENCES ims_product_type(id),
    "locationId" INTEGER REFERENCES ims_location(id),
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
-- ims_raw_sku already existed live before "productTypeId"/"locationId" were added to the
-- CREATE TABLE block above, so this migrates any already-created table too.
ALTER TABLE ims_raw_sku ADD COLUMN IF NOT EXISTS "productTypeId" INTEGER REFERENCES ims_product_type(id);
ALTER TABLE ims_raw_sku ADD COLUMN IF NOT EXISTS "locationId" INTEGER REFERENCES ims_location(id);

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

-- Inventory Home, backing /api/v1/inventories CRUD.
-- "categoryName"/"productType"/"locationName" are stored directly (denormalized strings
-- set by the frontend when picked from their respective master dropdowns), same
-- "schema was specified that way" approach already used by ims_material_inward's
-- vendorName/purchaseOrderNo - no FK/join needed.
-- "images" is a JSONB array of image URLs; these are client-side object URLs (created via
-- URL.createObjectURL) with no real file-upload/storage backing them yet, so they will not
-- survive a browser restart - same Tier-1 scoping already used for Raw SKU's unused
-- inventoryEntryMode/sourceType automation.
-- "assembly" is a JSONB array of kit components, each shaped like { skuCode, skuName, quantity }.
CREATE TABLE IF NOT EXISTS ims_inventories (
    id SERIAL PRIMARY KEY,
    images JSONB NOT NULL DEFAULT '[]',
    "skuId" VARCHAR(50) NOT NULL UNIQUE,
    "productName" VARCHAR(150) NOT NULL,
    "categoryName" VARCHAR(150),
    "productType" VARCHAR(150),
    barcode VARCHAR(50),
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "locationName" VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "unitCost" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "createdDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    assembly JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bill of Materials, backing /api/v1/boms CRUD.
-- "productSku"/"productName"/"categoryName" are stored directly (denormalized strings set
-- by the frontend when a finished-good Product is picked from Inventory Home), same
-- "schema was specified that way" approach already used by ims_material_inward's
-- vendorName/purchaseOrderNo and ims_inventories' own categoryName/locationName.
-- "items" is a JSONB array of raw-material lines, each shaped like:
-- { rawSkuCode, rawSkuName, requiredQty, unit, remarks }
-- The scaled "quantity needed" for a given production run (requiredQty * outputQty) is
-- computed client-side from "items" + "outputQty" and never persisted - same trust model
-- as every other computed total in this app.
CREATE TABLE IF NOT EXISTS ims_bom (
    id SERIAL PRIMARY KEY,
    "bomCode" VARCHAR(50) NOT NULL UNIQUE,
    "productSku" VARCHAR(50) NOT NULL,
    "productName" VARCHAR(150) NOT NULL,
    "categoryName" VARCHAR(150),
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    "outputQty" NUMERIC NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    status VARCHAR(20) NOT NULL DEFAULT 'Process',
    items JSONB NOT NULL DEFAULT '[]',
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "status" changed from Active/Inactive (was a template-usable toggle) to a Process/
-- Dispatch order lifecycle: a BOM starts Process, and moving it to Dispatch (via the
-- dedicated /:id/dispatch endpoint below) deducts each component's scaled quantity from
-- the matching Raw SKU's currentStock; reverting to Process (via /:id/revert) adds it
-- back. Migrates any rows saved under the old Active/Inactive values.
ALTER TABLE ims_bom ALTER COLUMN status SET DEFAULT 'Process';
UPDATE ims_bom SET status = 'Process' WHERE status = 'Active';
UPDATE ims_bom SET status = 'Dispatch' WHERE status = 'Inactive';

-- =====================================================================
-- CRM module (crm_*) - Module 1: full schema defined up front since all
-- 10 tables are FK-interrelated; only crm_stages/crm_sources get CRUD
-- endpoints in this module. All CRM tables use UUID PKs (first UUID
-- usage in this repo) to support external-ID lookups for the Meta Lead
-- Ads webhook integration planned for a later module.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Pipeline stages, admin-customizable via /crm/settings. "sortOrder" drives both the
-- Kanban column order (later module) and this reorder list; "outcome" flags terminal
-- stages (Won/Lost) without a DB CHECK constraint, validated in the controller instead -
-- matches this repo's existing convention of validating free-text status columns in code.
CREATE TABLE IF NOT EXISTS crm_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#64748B',
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    outcome VARCHAR(10) NOT NULL DEFAULT 'open',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_stages_name_lower_idx ON crm_stages (LOWER(name));

INSERT INTO crm_stages (name, "sortOrder", outcome, "isClosed") VALUES
    ('New Lead', 0, 'open', false),
    ('Contacted', 1, 'open', false),
    ('Qualified', 2, 'open', false),
    ('Follow Up', 3, 'open', false),
    ('Proposal Sent', 4, 'open', false),
    ('Negotiation', 5, 'open', false),
    ('Won', 6, 'won', true),
    ('Lost', 7, 'lost', true)
ON CONFLICT DO NOTHING;

-- Lead sources (Meta Lead Ads, website forms, manual entry, etc.), seeded per the CRM spec.
CREATE TABLE IF NOT EXISTS crm_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'Manual',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_sources_name_lower_idx ON crm_sources (LOWER(name));

INSERT INTO crm_sources (name, type) VALUES
    ('Meta Lead Ads', 'Meta'),
    ('Website Form', 'WebForm'),
    ('Manual Entry', 'Manual'),
    ('Google Ads', 'GoogleAds'),
    ('WhatsApp', 'WhatsApp'),
    ('Referral', 'Referral'),
    ('IndiaMART', 'IndiaMART'),
    ('Justdial', 'Justdial')
ON CONFLICT DO NOTHING;

-- Marketing campaigns, optionally tied to a source. No UI this module.
CREATE TABLE IF NOT EXISTS crm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    "sourceId" UUID REFERENCES crm_sources(id),
    "startDate" DATE,
    "endDate" DATE,
    budget NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_campaigns_source_idx ON crm_campaigns ("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS crm_campaigns_name_lower_idx ON crm_campaigns (LOWER(name));

-- Free-form lead tags. No UI this module.
CREATE TABLE IF NOT EXISTS crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#64748B',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_tags_name_lower_idx ON crm_tags (LOWER(name));

-- Central leads table. No UI this module (Leads/Kanban land in a later module) - defined
-- now since crm_followups/crm_notes/crm_activities/crm_lead_tags/crm_notifications all FK
-- to it. "assignedTo" reuses the existing ERP "users" table (SERIAL PK) rather than
-- introducing a separate CRM-user concept - CRM shares the same login/user model.
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadCode" VARCHAR(30) UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    company VARCHAR(150),
    "stageId" UUID REFERENCES crm_stages(id),
    "sourceId" UUID REFERENCES crm_sources(id),
    "campaignId" UUID REFERENCES crm_campaigns(id),
    "assignedTo" INTEGER REFERENCES users(id),
    value NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm_leads ("stageId");
CREATE INDEX IF NOT EXISTS crm_leads_source_idx ON crm_leads ("sourceId");
CREATE INDEX IF NOT EXISTS crm_leads_campaign_idx ON crm_leads ("campaignId");
CREATE INDEX IF NOT EXISTS crm_leads_assigned_idx ON crm_leads ("assignedTo");

-- Priority for the Kanban board's lead card (Module 3) - not part of the original table
-- since Leads CRUD (Module 2) didn't need it yet.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'Medium';

-- Starred/pinned flag for the Kanban card - added for the redesigned card, not part of the
-- original table.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "isStarred" BOOLEAN NOT NULL DEFAULT false;

-- Manual position within a stage's Kanban column, independent of createdAt - lets a drag-drop
-- reorder land a card exactly where it was dropped instead of always re-sorting by creation
-- date. Set on create (appended to the end of its stage) and rewritten for every lead in a
-- stage whenever that stage's column is reordered - see CrmLeadModel.reorderStage.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Scheduled follow-ups per lead. No UI this module.
CREATE TABLE IF NOT EXISTS crm_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    "dueAt" TIMESTAMPTZ NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'Call',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "completedAt" TIMESTAMPTZ,
    "createdBy" INTEGER REFERENCES users(id),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_followups_lead_idx ON crm_followups ("leadId");
CREATE INDEX IF NOT EXISTS crm_followups_due_idx ON crm_followups ("dueAt");

-- Free-text notes per lead. No UI this module.
CREATE TABLE IF NOT EXISTS crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    "createdBy" INTEGER REFERENCES users(id),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_notes_lead_idx ON crm_notes ("leadId");

-- Append-only activity/timeline log per lead. No UI this module.
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    "createdBy" INTEGER REFERENCES users(id),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON crm_activities ("leadId");
CREATE INDEX IF NOT EXISTS crm_activities_created_idx ON crm_activities ("createdAt");

-- Lead <-> Tag join table (composite PK, no surrogate id - pure junction table). No UI
-- this module.
CREATE TABLE IF NOT EXISTS crm_lead_tags (
    "leadId" UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    "tagId" UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("leadId", "tagId")
);
CREATE INDEX IF NOT EXISTS crm_lead_tags_tag_idx ON crm_lead_tags ("tagId");

-- Per-user notifications (e.g. new lead assigned, follow-up due). No UI this module.
CREATE TABLE IF NOT EXISTS crm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" INTEGER REFERENCES users(id),
    "leadId" UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_notifications_user_idx ON crm_notifications ("userId");
CREATE INDEX IF NOT EXISTS crm_notifications_read_idx ON crm_notifications ("isRead");
