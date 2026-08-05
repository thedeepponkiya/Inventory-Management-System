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

async function getNextSkuCode() {
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `SKU-${String(nextSeq).padStart(3, '0')}`;
}

async function create(skuCode, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "skuCode", "skuName", "categoryId", "productTypeId", "locationId", unit, "inventoryEntryMode", "sourceType", "rawMaterialId",
      "minStock", "maxStock", "reorderLevel", "openingStock", "currentStock", description, status, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
    ]
  );
  return findById(result.rows[0].id);
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "skuName" = $1, "categoryId" = $2, "productTypeId" = $3, "locationId" = $4, unit = $5, "inventoryEntryMode" = $6, "sourceType" = $7,
      "rawMaterialId" = $8, "minStock" = $9, "maxStock" = $10, "reorderLevel" = $11, "openingStock" = $12,
      "currentStock" = $13, description = $14, status = $15, "createdBy" = $16, "updatedAt" = now()
    WHERE id = $17
    RETURNING *`,
    [
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
      id,
    ]
  );
  return findById(result.rows[0].id);
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

// Atomic increment/decrement (delta can be negative) used by BOM dispatch/revert to adjust
// a Raw SKU's stock without a read-then-write race. No-ops if skuCode doesn't match any row.
async function adjustStockBySkuCode(skuCode, delta) {
  await pool.query(`UPDATE ${TABLE} SET "currentStock" = "currentStock" + $1, "updatedAt" = now() WHERE "skuCode" = $2`, [delta, skuCode]);
}

module.exports = { getAll, findById, getNextSkuCode, create, update, remove, adjustStockBySkuCode };
