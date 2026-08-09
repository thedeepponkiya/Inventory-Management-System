const crypto = require('crypto');
const pool = require('../config/db');

const TABLE = 'ims_bom';
const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByCode(bomCode) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "bomCode" = $1`, [bomCode]);
  return result.rows[0];
}

function randomOrderCode() {
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `ORD-${suffix}`;
}

// Random (not sequential) so a deleted order can never free up a code another order later
// collides with - collision odds are astronomically low (36^8 combinations) but this still
// retries on the off chance one is already taken, rather than trusting probability alone.
async function generateOrderCode() {
  let code = randomOrderCode();
  while (await findByCode(code)) {
    code = randomOrderCode();
  }
  return code;
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

module.exports = { getAll, findById, findByCode, generateOrderCode, create, update, remove };
