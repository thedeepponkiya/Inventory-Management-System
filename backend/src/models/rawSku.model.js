const pool = require('../config/db');

const TABLE = 'ims_raw_sku';

// Joins category + parent raw material names in so the frontend never has to do its own
// lookup-by-id just to display them - same "denormalize at read time" approach used by
// purchaseOrder.model.js for vendorName.
const SELECT_WITH_JOINS = `
  SELECT
    rs.*,
    c.category AS "categoryName",
    pt."productType" AS "productTypeName",
    loc.location AS "locationName",
    parent."skuName" AS "rawMaterialName"
  FROM ${TABLE} rs
  LEFT JOIN ims_category c ON c.id = rs."categoryId"
  LEFT JOIN ims_product_type pt ON pt.id = rs."productTypeId"
  LEFT JOIN ims_location loc ON loc.id = rs."locationId"
  LEFT JOIN ${TABLE} parent ON parent.id = rs."rawMaterialId"
`;

async function getAll() {
  const result = await pool.query(`${SELECT_WITH_JOINS} ORDER BY rs.id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_JOINS} WHERE rs.id = $1`, [id]);
  return result.rows[0];
}

// MAX-based (not COUNT-based): COUNT(*)+1 silently collides with an ALREADY-USED code
// whenever the sequence has any gap (a deleted SKU) - the UNIQUE constraint on skuCode then
// makes every create() fail with a raw Postgres error, and since the failed insert never
// advances the count, every subsequent create fails identically until the gap is filled back
// in. Taking the highest existing numeric suffix instead is immune to gaps - same fix already
// applied to salesOrder.model.js/purchaseOrder.model.js/materialInward.model.js.
async function getNextSkuCode() {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("skuCode" FROM 5) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "skuCode" ~ '^SKU-[0-9]+$'`
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `SKU-${String(nextSeq).padStart(3, '0')}`;
}

async function create(skuCode, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "skuCode", "skuName", "categoryId", "productTypeId", "locationId", unit, "inventoryEntryMode", "sourceType", "rawMaterialId",
      "minStock", "maxStock", "reorderLevel", "openingStock", "currentStock", description, status, "createdBy", images, material
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
    [
      skuCode,
      fields.skuName,
      fields.categoryId,
      fields.productTypeId,
      fields.locationId,
      fields.unit,
      fields.inventoryEntryMode,
      fields.sourceType,
      fields.rawMaterialId,
      fields.minStock,
      fields.maxStock,
      fields.reorderLevel,
      fields.openingStock,
      fields.currentStock,
      fields.description,
      fields.status,
      fields.createdBy,
      JSON.stringify(fields.images),
      fields.material,
    ]
  );
  return findById(result.rows[0].id);
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "skuCode" = $1, "skuName" = $2, "categoryId" = $3, "productTypeId" = $4, "locationId" = $5, unit = $6, "inventoryEntryMode" = $7, "sourceType" = $8,
      "rawMaterialId" = $9, "minStock" = $10, "maxStock" = $11, "reorderLevel" = $12, "openingStock" = $13,
      "currentStock" = COALESCE($14, "currentStock"), description = $15, status = $16, "createdBy" = $17, images = $18, material = $19, "updatedAt" = now()
    WHERE id = $20
    RETURNING *`,
    [
      fields.skuCode,
      fields.skuName,
      fields.categoryId,
      fields.productTypeId,
      fields.locationId,
      fields.unit,
      fields.inventoryEntryMode,
      fields.sourceType,
      fields.rawMaterialId,
      fields.minStock,
      fields.maxStock,
      fields.reorderLevel,
      fields.openingStock,
      fields.currentStock,
      fields.description,
      fields.status,
      fields.createdBy,
      JSON.stringify(fields.images),
      fields.material,
      id,
    ]
  );
  return findById(result.rows[0].id);
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

// Atomic increment/decrement (delta can be negative) used by BOM item complete/revert and
// Material Inward receiving to adjust a Raw SKU's stock without a read-then-write race.
// Accepts an optional transaction client (`db`) so callers that need this inside a
// BEGIN/COMMIT block (e.g. bom.controller.js's completeBomItem, which validates-then-deducts
// multiple SKUs atomically) can pass one in; defaults to the shared pool for every existing
// call site that doesn't need a transaction.
//
// RETURNING id (rather than firing the UPDATE and ignoring its result) so a skuCode that
// matches NO row is detectable by the caller instead of being a completely silent no-op -
// materialInward.controller.js's applyStockForItems relies on this to surface a warning when
// a received item's skuCode isn't a real Raw SKU code, which used to mean stock quietly never
// moved with nothing anywhere reporting it. Returns the updated row, or undefined when
// nothing matched.
async function adjustStockBySkuCode(skuCode, delta, db = pool) {
  const result = await db.query(
    `UPDATE ${TABLE} SET "currentStock" = "currentStock" + $1, "updatedAt" = now() WHERE "skuCode" = $2 RETURNING id`,
    [delta, skuCode]
  );
  return result.rows[0];
}

// Used by bom.controller.js's completeBomItem to check (and, via `FOR UPDATE`, lock) a raw
// material's live stock before deducting - prevents two concurrent BOM item completions from
// both reading the same starting stock and both passing a sufficiency check that only one of
// them should have passed. Only ever called with a transaction client, never the bare pool.
async function findByCodeForUpdate(skuCode, client) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE "skuCode" = $1 FOR UPDATE`, [skuCode]);
  return result.rows[0];
}

// Used by rawSku.controller.js's manual "Update Stock" action (Add/Remove some quantity,
// distinct from editing the record's other fields). The `"currentStock" + $1 >= 0` guard
// makes this a single atomic conditional UPDATE rather than a separate read-check-then-write -
// two concurrent "Remove" requests against the same row can't both read the same starting
// stock and both pass a sufficiency check that only one of them should have passed, the same
// race adjustStockBySkuCode above is already immune to by never reading first at all. Returns
// no row (falsy) when the guard fails, i.e. there isn't enough stock to remove that much.
async function adjustStockById(id, delta, db = pool) {
  const result = await db.query(
    `UPDATE ${TABLE} SET "currentStock" = "currentStock" + $1, "updatedAt" = now() WHERE id = $2 AND "currentStock" + $1 >= 0 RETURNING *`,
    [delta, id]
  );
  return result.rows[0];
}

// Plain (unlocked) existence check - used by createRawSku to validate a user-typed skuCode
// (the field is editable at create time) isn't already taken, without the row-locking
// semantics findByCodeForUpdate needs for its own transactional use.
async function findByCode(skuCode) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "skuCode" = $1`, [skuCode]);
  return result.rows[0];
}

module.exports = { getAll, findById, findByCode, getNextSkuCode, create, update, remove, adjustStockBySkuCode, findByCodeForUpdate, adjustStockById };
