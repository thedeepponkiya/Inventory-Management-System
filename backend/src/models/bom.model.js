const pool = require('../config/db');

const TABLE = 'ims_bom';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function getNextBomCode() {
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `BOM-${String(nextSeq).padStart(4, '0')}`;
}

async function create(bomCode, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "bomCode", "productSku", "productName", "categoryName", version, "outputQty", unit, status, items, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      bomCode,
      fields.productSku,
      fields.productName,
      fields.categoryName,
      fields.version,
      fields.outputQty,
      fields.unit,
      fields.status,
      JSON.stringify(fields.items),
      fields.createdBy,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "productSku" = $1, "productName" = $2, "categoryName" = $3, version = $4, "outputQty" = $5,
      unit = $6, status = $7, items = $8, "createdBy" = $9, "updatedAt" = now()
    WHERE id = $10
    RETURNING *`,
    [
      fields.productSku,
      fields.productName,
      fields.categoryName,
      fields.version,
      fields.outputQty,
      fields.unit,
      fields.status,
      JSON.stringify(fields.items),
      fields.createdBy,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, getNextBomCode, create, update, remove };
