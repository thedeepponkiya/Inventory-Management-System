const pool = require('../config/db');

const TABLE = 'ims_sales_order_payments';

// Exact mirror of purchaseOrderPayment.model.js - see its comments for the full reasoning.
// Every function accepts an optional `client` (a checked-out pg client mid-transaction) so the
// controller can run these inside the same BEGIN/COMMIT block as the row-locked SO read/
// update - falls back to the shared pool for the plain read-only list endpoint, which has
// nothing to lock.
async function getBySoId(soId, client = pool) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE "soId" = $1 ORDER BY "paymentDate" ASC, "createdAt" ASC`, [soId]);
  return result.rows;
}

async function getSumBySoId(soId, client = pool) {
  const result = await client.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM ${TABLE} WHERE "soId" = $1`, [soId]);
  return Number(result.rows[0].total);
}

async function create(fields, client = pool) {
  const result = await client.query(
    `INSERT INTO ${TABLE} (
      "soId", amount, "paymentDate", "paymentMethod", remarks, "recordedBy",
      "paymentTerms", "approvedBy", "approvedAt"
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      fields.soId,
      fields.amount,
      fields.paymentDate,
      fields.paymentMethod,
      fields.remarks,
      fields.recordedBy,
      fields.paymentTerms,
      fields.approvedBy,
      fields.approvedAt,
    ]
  );
  return result.rows[0];
}

async function findById(id, client = pool) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function remove(id, client = pool) {
  await client.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getBySoId, getSumBySoId, create, findById, remove };
