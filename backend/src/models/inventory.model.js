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

async function getNextSkuId() {
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `SKU-${String(nextSeq).padStart(4, '0')}`;
}

async function create(skuId, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      images, "skuId", "productName", "categoryName", "productType", barcode,
      quantity, unit, "locationName", status, "unitCost", "createdDate", assembly
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      fields.createdDate,
      JSON.stringify(fields.assembly),
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      images = $1, "productName" = $2, "categoryName" = $3, "productType" = $4, barcode = $5,
      quantity = $6, unit = $7, "locationName" = $8, status = $9, "unitCost" = $10, assembly = $11,
      "updatedAt" = now()
    WHERE id = $12
    RETURNING *`,
    [
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
      JSON.stringify(fields.assembly),
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, getNextSkuId, create, update, remove };
