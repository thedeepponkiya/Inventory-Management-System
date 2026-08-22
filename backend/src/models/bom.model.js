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

// Locks the BOM row (via `FOR UPDATE`) for the duration of a complete/revert transaction, so
// two concurrent requests against the same order can't both see status = 'Process' and both
// proceed. Only ever called with a transaction client, never the bare pool.
async function findByIdForUpdate(id, client) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE id = $1 FOR UPDATE`, [id]);
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

// Accepts an optional transaction client (`db`), same reasoning as rawSku.model.js's
// adjustStockBySkuCode - completeBom/revertBomToProcess need this update to commit or roll
// back atomically together with the raw-material/finished-good stock adjustments.
// `reversedQty` defaults to whatever the caller passes (falls back to 0 for plain edits via
// updateBom, which never touch it) - see revertBomToProcess for how it accumulates on partial
// reverts and resets once a BOM is fully reverted back to Process.
async function update(id, fields, db = pool) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
      "productSku" = $1, "productName" = $2, "categoryName" = $3, version = $4, "outputQty" = $5,
      unit = $6, status = $7, items = $8, "createdBy" = $9, "reversedQty" = $10, "updatedAt" = now()
    WHERE id = $11
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
      fields.reversedQty ?? 0,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id, db = pool) {
  await db.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByCode, findByIdForUpdate, generateOrderCode, create, update, remove };
