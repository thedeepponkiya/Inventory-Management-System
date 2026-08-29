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
-- Lets a real, fully-functional login row (e.g. a break-glass/system Super Admin account)
-- exist without ever showing up in the User Management list - see user.model.js's getAll().
-- There is no RBAC in this app today (any authenticated session already has full API
-- access), so this column controls list VISIBILITY only, not permissions.
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- Locations master, backing /api/v1/locations CRUD.
CREATE TABLE IF NOT EXISTS ims_location (
    id SERIAL PRIMARY KEY,
    location VARCHAR(150) NOT NULL,
    description VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_location_location_lower_idx ON ims_location (LOWER(location));
-- ims_location already existed live before "createdAt" was added to the CREATE TABLE block
-- above, so this migrates any already-created table too (same pattern used by ims_raw_sku).
ALTER TABLE ims_location ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
-- Optional free-text note shown in the redesigned Add/Edit Location dialog (200-char limit
-- enforced client-side, matching the VARCHAR(200) here).
ALTER TABLE ims_location ADD COLUMN IF NOT EXISTS description VARCHAR(200);

-- Categories master, backing /api/v1/categories CRUD.
CREATE TABLE IF NOT EXISTS ims_category (
    id SERIAL PRIMARY KEY,
    category VARCHAR(150) NOT NULL,
    description VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_category_category_lower_idx ON ims_category (LOWER(category));
ALTER TABLE ims_category ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
-- Optional free-text note, same as ims_location's - see its own comment above.
ALTER TABLE ims_category ADD COLUMN IF NOT EXISTS description VARCHAR(200);

-- Product types master, backing /api/v1/product-types CRUD.
CREATE TABLE IF NOT EXISTS ims_product_type (
    id SERIAL PRIMARY KEY,
    "productType" VARCHAR(150) NOT NULL,
    description VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_product_type_lower_idx ON ims_product_type (LOWER("productType"));
ALTER TABLE ims_product_type ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE ims_product_type ADD COLUMN IF NOT EXISTS description VARCHAR(200);

-- Units of measure master, backing /api/v1/units CRUD.
CREATE TABLE IF NOT EXISTS ims_unit (
    id SERIAL PRIMARY KEY,
    unit VARCHAR(20) NOT NULL,
    description VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_unit_lower_idx ON ims_unit (LOWER(unit));
ALTER TABLE ims_unit ADD COLUMN IF NOT EXISTS description VARCHAR(200);

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

-- Customer master, backing /api/v1/customers CRUD - mirrors ims_vendor exactly (same
-- shape/uniqueness rule), just for the sell side instead of the buy side.
CREATE TABLE IF NOT EXISTS ims_customer (
    id SERIAL PRIMARY KEY,
    "customerName" VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    "phoneNumber" VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    "zipCode" VARCHAR(20),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ims_customer_customername_lower_idx ON ims_customer (LOWER("customerName"));

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
-- "images" is a JSONB array of image URLs (same shape/upload backing as ims_inventories.images).
ALTER TABLE ims_raw_sku ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
-- Free-text material composition (e.g. "Cotton", "Steel", "Plastic") - not a master list like
-- Category/Unit, just a plain descriptive field shown on the SKU form and table.
ALTER TABLE ims_raw_sku ADD COLUMN IF NOT EXISTS material VARCHAR(100);

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
    "shippingDate" DATE,
    "deliveryAddress" TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" NUMERIC NOT NULL DEFAULT 0,
    "subTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discountAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "gstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "grandTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    "createdBy" VARCHAR(150),
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
-- ims_purchase_order already existed live before Payment Status/Paid Amount/Currency were
-- added to the CREATE TABLE block above (mirroring ims_sales_order's own fields), so this
-- migrates any already-created table too. "Remain Amount" (in the PO list columns) is
-- always derived as grandTotal - paidAmount, never stored separately.
ALTER TABLE ims_purchase_order ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'Unpaid';
ALTER TABLE ims_purchase_order ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0;
-- Payment Terms/Approved By/Approved At/Currency were removed from the PO form entirely
-- (per-transaction equivalents already exist as needed - see Transaction History/Add
-- Payment) - drops both the columns and any data in them for any DB that already had them.
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS "paymentTerms";
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS "approvedBy";
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS "approvedAt";
ALTER TABLE ims_purchase_order DROP COLUMN IF EXISTS currency;
-- ims_purchase_order already existed live before "shippingDate" was added to the CREATE TABLE
-- block above (Delivery And Notes section), so this migrates any already-created table too.
ALTER TABLE ims_purchase_order ADD COLUMN IF NOT EXISTS "shippingDate" DATE;

-- One row per payment recorded against a Purchase Order (the "Transaction History" tab) -
-- ims_purchase_order."paidAmount" is no longer typed in directly, it's always the SUM of this
-- table's rows for that PO (recomputed server-side on every add/delete, see
-- purchaseOrderPayment.controller.js), same "don't trust a single mutable number, derive it"
-- reasoning as computeOrderTotals/derivePaymentStatus in orderTotals.js. ON DELETE CASCADE so
-- deleting a PO cleans up its payment history automatically.
CREATE TABLE IF NOT EXISTS ims_purchase_order_payments (
    id SERIAL PRIMARY KEY,
    "poId" INTEGER NOT NULL REFERENCES ims_purchase_order(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(30),
    remarks TEXT,
    "recordedBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Per-transaction (not PO-level - the PO no longer has its own paymentTerms/approvedBy/
    -- approvedAt at all) terms/approval, since each payment can be approved separately under
    -- its own terms.
    "paymentTerms" VARCHAR(50),
    "approvedBy" VARCHAR(150),
    "approvedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ims_purchase_order_payments_po_idx ON ims_purchase_order_payments ("poId");
-- ims_purchase_order_payments already existed live before paymentTerms/approvedBy/approvedAt
-- were (re-)added to the CREATE TABLE block above, so this migrates any already-created table
-- too.
ALTER TABLE ims_purchase_order_payments ADD COLUMN IF NOT EXISTS "paymentTerms" VARCHAR(50);
ALTER TABLE ims_purchase_order_payments ADD COLUMN IF NOT EXISTS "approvedBy" VARCHAR(150);
ALTER TABLE ims_purchase_order_payments ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;

-- Sales orders, backing /api/v1/sales-orders CRUD.
-- "items" is a JSONB array of finished-good lines, each shaped like:
-- { skuId, skuCode, itemName, unit, orderedQty, dispatchedQty, pendingQty, unitPrice,
--   discountPercent, discountAmount, gstPercent, gstAmount, lineTotal }
-- customerName/customerGstNo are plain fields (denormalized string, same approach as
-- Invoice's "customerSupplier") rather than a foreign key into ims_customer.
-- Lifecycle: Draft -> Confirmed -> Processing -> (Partially Shipped <-> Dispatched via the
-- /dispatch action, which deducts each shipped line's qty straight from ims_inventories -
-- the mirror of BOM's Dispatch step, but on the sell side) -> Cancelled is only reachable
-- before any stock has actually shipped.
CREATE TABLE IF NOT EXISTS ims_sales_order (
    id SERIAL PRIMARY KEY,
    "soNo" VARCHAR(50) NOT NULL UNIQUE,
    "customerName" VARCHAR(150) NOT NULL,
    "customerGstNo" VARCHAR(50),
    "orderDate" DATE NOT NULL,
    "deliveryDate" DATE,
    "deliveryAddress" TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
    "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" NUMERIC NOT NULL DEFAULT 0,
    "subTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discountAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "gstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "grandTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ims_sales_order already existed live before "paidAmount" was added to the CREATE TABLE
-- block above, so this migrates any already-created table too. "Remain Amount" (in the
-- SO list/columns) is always derived as grandTotal - paidAmount, never stored separately.
ALTER TABLE ims_sales_order ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE ims_sales_order ADD COLUMN IF NOT EXISTS "purchaseOrderRef" VARCHAR(100);
-- Payment Terms/Currency were tried at the SO level (mirroring ims_purchase_order's identical
-- fields) and then removed again - the per-transaction equivalents on
-- ims_sales_order_payments (Transaction History) cover the same need, see its own comment.
-- Undoes the ADD COLUMN migration this same file previously carried, for any DB that already
-- ran it.
ALTER TABLE ims_sales_order DROP COLUMN IF EXISTS "paymentTerms";
ALTER TABLE ims_sales_order DROP COLUMN IF EXISTS currency;
-- Repurposed from a free-text "Customer Code" field to the customer's GST number - same
-- column, same denormalized-string nature, just renamed (and re-typed in the UI) to match
-- what it actually holds now. Guarded (same pattern as "users".password -> "passwordHash"
-- above) since a fresh install's CREATE TABLE already names the column "customerGstNo".
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ims_sales_order' AND column_name = 'customerCode') THEN
        ALTER TABLE ims_sales_order RENAME COLUMN "customerCode" TO "customerGstNo";
    END IF;
END $$;

-- One row per payment recorded against a Sales Order (the "Transaction History" tab) - exact
-- mirror of ims_purchase_order_payments (see its comment for the full reasoning: paidAmount
-- is derived as the SUM of these rows, never typed in directly, recomputed server-side on
-- every add/delete). paymentTerms/approvedBy/approvedAt are per-transaction, independent of
-- the SO's own same-named fields. ON DELETE CASCADE so deleting an SO cleans up its payment
-- history automatically.
CREATE TABLE IF NOT EXISTS ims_sales_order_payments (
    id SERIAL PRIMARY KEY,
    "soId" INTEGER NOT NULL REFERENCES ims_sales_order(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentMethod" VARCHAR(30),
    remarks TEXT,
    "recordedBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "paymentTerms" VARCHAR(50),
    "approvedBy" VARCHAR(150),
    "approvedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ims_sales_order_payments_so_idx ON ims_sales_order_payments ("soId");

-- One row per dispatchSalesOrder call (the "Dispatch History" tab) - unlike payments this is
-- read-only/append-only (no delete endpoint): "Revert Dispatch" undoes the SO's aggregate
-- dispatchedQty/pendingQty and Inventory stock in one shot (see revertDispatch in
-- salesOrder.controller.js) but intentionally does not remove rows here, so the ledger of
-- what was actually shipped and when is never lost even across a revert. "items" is a JSONB
-- array shaped like [{ skuId, skuCode, itemName, unit, shipQty }] - only the lines/quantities
-- that were part of THIS specific dispatch call, not the SO's full item list. ON DELETE
-- CASCADE so deleting an SO cleans up its dispatch history automatically.
CREATE TABLE IF NOT EXISTS ims_sales_order_dispatches (
    id SERIAL PRIMARY KEY,
    "soId" INTEGER NOT NULL REFERENCES ims_sales_order(id) ON DELETE CASCADE,
    "dispatchDate" DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    "dispatchedBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ims_sales_order_dispatches_so_idx ON ims_sales_order_dispatches ("soId");

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
-- Stock-health thresholds for the Current Stock column's progress bar/tier badge (same
-- design as ims_raw_sku, minus a separate Reorder Level - `minStock` doubles as the "Low"
-- threshold here since Inventory items don't have their own reorder workflow).
ALTER TABLE ims_inventories ADD COLUMN IF NOT EXISTS "minStock" NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE ims_inventories ADD COLUMN IF NOT EXISTS "maxStock" NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE ims_inventories ADD COLUMN IF NOT EXISTS "openingStock" NUMERIC NOT NULL DEFAULT 0;
-- Selling Cost (what this item is sold for) alongside the existing "unitCost" (Product
-- Cost - what it costs to acquire/produce) - kept as two separate columns since margin
-- reporting needs both, not just one overwriting the other.
ALTER TABLE ims_inventories ADD COLUMN IF NOT EXISTS "sellingCost" NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Bill of Materials, backing /api/v1/boms CRUD. A BOM is just a code plus a list of Inventory
-- items to produce - see the migration block below (after the old Active/Inactive/Dispatch
-- status history) for how this evolved away from a single shared "Output Product" per BOM.
-- "items" is a JSONB array of lines, each shaped like:
-- { skuId, productName, requiredQty, unit, remarks, status } - skuId matches
-- ims_inventories.skuId, requiredQty is the absolute quantity of that Inventory item to
-- produce, and status ('Pending' | 'Completed') tracks that one line's own completion
-- independently of every other line in the same BOM.
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
    "reversedQty" NUMERIC NOT NULL DEFAULT 0,
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- How much of a Completed BOM's outputQty has been reverted so far via partial reverts
-- (revertBomToProcess accepts a qty and accumulates it here instead of always undoing the
-- whole run) - reset to 0 once a BOM is back in Process (fully reverted, or freshly
-- completed again), since the counter only means something relative to the current
-- Completed run's outputQty.
ALTER TABLE ims_bom ADD COLUMN IF NOT EXISTS "reversedQty" NUMERIC NOT NULL DEFAULT 0;
-- "status" changed from Active/Inactive (was a template-usable toggle) to a Process ->
-- Completed order lifecycle: a BOM starts Process, and moving it to Completed (via the
-- dedicated /:id/complete endpoint) deducts each component's scaled quantity from the
-- matching Raw SKU's currentStock and adds outputQty onto the finished good's Inventory;
-- reverting to Process (via /:id/revert) undoes both. Migrates any rows saved under the
-- old Active/Inactive values.
ALTER TABLE ims_bom ALTER COLUMN status SET DEFAULT 'Process';
UPDATE ims_bom SET status = 'Process' WHERE status = 'Active';
UPDATE ims_bom SET status = 'Dispatch' WHERE status = 'Inactive';
-- The "Dispatch" stage (shipped-out, which re-deducted Inventory after Completed had added
-- it) was removed - Sales Order now owns that "shipped to customer" concept instead, so a
-- BOM's own lifecycle stops at Completed. Any row still sitting in the old Dispatch status
-- had its Inventory net effect zeroed out (added at Completed, removed again at Dispatch);
-- since Completed is now terminal and assumes the stock is sitting in Inventory, that
-- removed quantity is added back before relabeling the row, so on-hand stock stays correct.
UPDATE ims_inventories inv
SET quantity = inv.quantity + sub.total_output
FROM (
    SELECT "productSku", SUM("outputQty") AS total_output
    FROM ims_bom
    WHERE status = 'Dispatch'
    GROUP BY "productSku"
) sub
WHERE inv."skuId" = sub."productSku";
UPDATE ims_bom SET status = 'Completed' WHERE status = 'Dispatch';

-- BOM dropped the single "Output Product" concept entirely - there is no longer one product
-- this whole BOM produces with one shared Output Qty. Instead each line in "items" is itself
-- an Inventory item to be produced, completed independently (see bom.controller.js's
-- completeBomItem/revertBomItem): completing a line deducts that Inventory item's own
-- Finished SKU assembly (ims_inventories.assembly, scaled by that line's own requiredQty)
-- from ims_raw_sku."currentStock", and credits requiredQty onto that same Inventory item's
-- own quantity - the "component consumes to produce something else" model is gone, replaced
-- by "each line is its own producible target". "status" is now derived server-side from the
-- items' own per-line status (added to each item object: 'Pending' | 'Completed') every time
-- items change - Process (none completed) / "Partially Completed" (some) / Completed (all).
-- "outputQty"/"reversedQty" (the old whole-BOM batch-size and partial-revert-tracking
-- columns) and "productSku"/"productName"/"categoryName" (the old single output product)
-- are no longer written by the app - left in place (nullable) rather than dropped, since
-- existing rows still have real values in them and nothing here needs a hard migration.
ALTER TABLE ims_bom ALTER COLUMN "productSku" DROP NOT NULL;
ALTER TABLE ims_bom ALTER COLUMN "productName" DROP NOT NULL;
ALTER TABLE ims_bom ALTER COLUMN "outputQty" DROP NOT NULL;
ALTER TABLE ims_bom ALTER COLUMN unit DROP NOT NULL;

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

-- Campaigns (Marketing campaigns module) was built and then fully removed - this drop undoes
-- the table (CASCADE also drops crm_leads."campaignId"'s FK constraint to it, see the
-- ALTER TABLE ... DROP COLUMN IF EXISTS "campaignId" further down for the column itself) for
-- any database that already ran the CREATE TABLE version of this block, including any data it
-- held.
DROP TABLE IF EXISTS crm_campaigns CASCADE;

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
    "assignedTo" INTEGER REFERENCES users(id),
    value NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm_leads ("stageId");
CREATE INDEX IF NOT EXISTS crm_leads_source_idx ON crm_leads ("sourceId");
CREATE INDEX IF NOT EXISTS crm_leads_assigned_idx ON crm_leads ("assignedTo");
-- Campaigns module removed (see crm_campaigns' own DROP TABLE above) - drops the column for
-- any database that already had it, along with whatever campaign links it held.
ALTER TABLE crm_leads DROP COLUMN IF EXISTS "campaignId";

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

-- Meta (Facebook/Instagram) Lead Ads integration was built and then fully removed (client's
-- live account - the integration is out of scope for now) - these drops undo the polling-sync
-- columns/index and the connection table for any database that already ran them, including
-- any data they held (all Meta-only fields/rows, never populated for a manually-created lead).
DROP INDEX IF EXISTS crm_leads_meta_lead_id_idx;
ALTER TABLE crm_leads DROP COLUMN IF EXISTS "metaLeadId";
ALTER TABLE crm_leads DROP COLUMN IF EXISTS "metaFormId";
ALTER TABLE crm_leads DROP COLUMN IF EXISTS "metaFormName";
DROP TABLE IF EXISTS crm_meta_integration;

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

-- Single generic key-value store backing every Developer Admin section (only "Manage
-- Visibility" exists today, but every future section - API Keys, Webhooks, etc. - persists
-- through this same table too, one row per "settingKey", instead of each section getting its
-- own dedicated table). "Manage Visibility"'s data lives under settingKey = 'ui-visibility',
-- with "settingValue" shaped { hiddenQuickActions: string[], hiddenSidebarItems: string[] } -
-- see developerAdminSettings.model.js.
CREATE TABLE IF NOT EXISTS ims_developer_admin_settings (
    id SERIAL PRIMARY KEY,
    "settingKey" VARCHAR(100) NOT NULL UNIQUE,
    "settingValue" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developer Admin's Custom Fields feature - metadata only. "entityKey" is validated
-- server-side against a fixed whitelist (customFieldEntities.util.js, e.g. 'purchaseOrder' ->
-- table ims_purchase_order), never trusted as a raw table name. "columnName" is the real,
-- already-created column on that entity's table (see customField.service.js - it both derives
-- this name from the label AND runs the actual `ALTER TABLE ... ADD COLUMN` at creation time),
-- so this row is a description of a column that genuinely exists, not just a display label.
-- "fieldType" is one of a fixed whitelist too (customFieldTypes.util.js), each mapped to
-- exactly one safe SQL column type - never a user-supplied SQL type string. "options" is only
-- populated for fieldType = 'dropdown' (its own choice list). The unique index prevents two
-- fields on the same entity ever fighting over one physical column.
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id SERIAL PRIMARY KEY,
    "entityKey" VARCHAR(50) NOT NULL,
    "columnName" VARCHAR(63) NOT NULL,
    label VARCHAR(150) NOT NULL,
    "fieldType" VARCHAR(20) NOT NULL,
    options JSONB,
    required BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" VARCHAR(150),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS custom_field_definitions_entity_column_idx ON custom_field_definitions ("entityKey", "columnName");
