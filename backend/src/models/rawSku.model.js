const pool = require('../config/db');

const TABLE = 'ims_raw_sku';

// Joins category + parent raw material names in so the frontend never has to do its own
// lookup-by-id just to display them - same "denormalize at read time" approach used by
// purchaseOrder.model.js for vendorName.
const SELECT_WITH_JOINS = `
  SELECT
    rs.*,
    c.category AS "categoryName",
    parent."skuName" AS "rawMaterialName"
  FROM ${TABLE} rs
  LEFT JOIN ims_category c ON c.id = rs."categoryId"
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
      "skuCode", "skuName", "categoryId", unit, "inventoryEntryMode", "sourceType", "rawMaterialId",
      "minStock", "maxStock", "reorderLevel", "openingStock", "currentStock", description, status, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      skuCode,
      fields.skuName,
      fields.categoryId,
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
      "skuName" = $1, "categoryId" = $2, unit = $3, "inventoryEntryMode" = $4, "sourceType" = $5,
      "rawMaterialId" = $6, "minStock" = $7, "maxStock" = $8, "reorderLevel" = $9, "openingStock" = $10,
      "currentStock" = $11, description = $12, status = $13, "createdBy" = $14, "updatedAt" = now()
    WHERE id = $15
    RETURNING *`,
    [
      fields.skuName,
      fields.categoryId,
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

module.exports = { getAll, findById, getNextSkuCode, create, update, remove };
