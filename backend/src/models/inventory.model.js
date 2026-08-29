const pool = require('../config/db');

const TABLE = 'ims_inventories';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findBySkuId(skuId) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "skuId" = $1`, [skuId]);
  return result.rows[0];
}

// Atomic delta-update (mirrors rawSku.model.js's adjustStockBySkuCode) - used when a BOM
// Order is Completed/reverted, so the finished-good's quantity is added to/subtracted from
// directly rather than a read-then-write that could race with another update. Accepts an
// optional transaction client (`db`), same reasoning as adjustStockBySkuCode.
async function adjustStockBySkuId(skuId, delta, db = pool) {
  await db.query(`UPDATE ${TABLE} SET quantity = quantity + $1, "updatedAt" = now() WHERE "skuId" = $2`, [delta, skuId]);
}

// Locks the Inventory row (via `FOR UPDATE`) while checking/adjusting stock inside a Sales
// Order dispatch transaction, so two concurrent dispatches against the same SKU can't both
// read the same starting quantity and both pass a sufficiency check. Only ever called with a
// transaction client, never the bare pool.
async function findBySkuIdForUpdate(skuId, client) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE "skuId" = $1 FOR UPDATE`, [skuId]);
  return result.rows[0];
}

// MAX-based (not COUNT-based) - see rawSku.model.js's getNextSkuCode for why COUNT(*)+1
// silently collides with an already-used code whenever the sequence has any gap.
async function getNextSkuId() {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("skuId" FROM 5) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "skuId" ~ '^SKU-[0-9]+$'`
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `SKU-${String(nextSeq).padStart(4, '0')}`;
}

async function create(skuId, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      images, "skuId", "productName", "categoryName", "productType", barcode,
      quantity, unit, "locationName", status, "unitCost", "sellingCost", "createdDate", assembly,
      "minStock", "maxStock", "openingStock"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      JSON.stringify(fields.images),
      skuId,
      fields.productName,
      fields.categoryName,
      fields.productType,
      fields.barcode,
      fields.quantity,
      fields.unit,
      fields.locationName,
      fields.status,
      fields.unitCost,
      fields.sellingCost,
      fields.createdDate,
      JSON.stringify(fields.assembly),
      fields.minStock,
      fields.maxStock,
      fields.openingStock,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "skuId" = $1, images = $2, "productName" = $3, "categoryName" = $4, "productType" = $5, barcode = $6,
      quantity = COALESCE($7, quantity), unit = $8, "locationName" = $9, status = $10, "unitCost" = $11, "sellingCost" = $12, assembly = $13,
      "minStock" = $14, "maxStock" = $15, "openingStock" = $16, "updatedAt" = now()
    WHERE id = $17
    RETURNING *`,
    [
      fields.skuId,
      JSON.stringify(fields.images),
      fields.productName,
      fields.categoryName,
      fields.productType,
      fields.barcode,
      fields.quantity,
      fields.unit,
      fields.locationName,
      fields.status,
      fields.unitCost,
      fields.sellingCost,
      JSON.stringify(fields.assembly),
      fields.minStock,
      fields.maxStock,
      fields.openingStock,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

// How many Inventory items have at least one Product Assembly line referencing this Raw SKU
// code. Used by rawSku.controller.js to guard a rename/delete - see bom.model.js's
// countBySkuId for the same reasoning; here the dangling reference would make every future
// BOM completion for that finished good either fail its stock check forever or silently
// deduct nothing (adjustStockBySkuCode no-ops on a code that matches no row).
async function countByAssemblySkuCode(skuCode) {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT i.id) FROM ${TABLE} i, jsonb_array_elements(i.assembly) line WHERE line->>'skuCode' = $1`,
    [skuCode]
  );
  return Number(result.rows[0].count);
}

module.exports = { getAll, findById, findBySkuId, findBySkuIdForUpdate, adjustStockBySkuId, getNextSkuId, create, update, remove, countByAssemblySkuCode };
