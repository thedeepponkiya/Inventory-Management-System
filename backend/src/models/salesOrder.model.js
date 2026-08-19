const pool = require('../config/db');

const TABLE = 'ims_sales_order';

// "payments"/"dispatches" are aggregated in here (rather than fetched separately by the
// frontend) so the Transaction History / Dispatch History tabs get their data for free from
// the same global fetch-all-SOs call AppContext already makes on load - mirrors
// purchaseOrder.model.js's identical SELECT_WITH_VENDOR pattern (SO has no vendor to join, so
// this is just the two subqueries on their own). COALESCE(..., '[]') so an SO with none yet
// gets an empty array instead of a SQL NULL.
const SELECT_WITH_PAYMENTS = `
  SELECT so.*,
    COALESCE(
      (SELECT json_agg(p.* ORDER BY p."paymentDate" ASC, p."createdAt" ASC)
       FROM ims_sales_order_payments p WHERE p."soId" = so.id),
      '[]'
    ) AS payments,
    COALESCE(
      (SELECT json_agg(d.* ORDER BY d."dispatchDate" ASC, d."createdAt" ASC)
       FROM ims_sales_order_dispatches d WHERE d."soId" = so.id),
      '[]'
    ) AS dispatches
  FROM ${TABLE} so
`;

async function getAll() {
  const result = await pool.query(`${SELECT_WITH_PAYMENTS} ORDER BY so.id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_PAYMENTS} WHERE so.id = $1`, [id]);
  return result.rows[0];
}

// Locks the Sales Order row (via `FOR UPDATE`) for the duration of a dispatch/revert
// transaction, so two concurrent requests against the same order can't both read the same
// starting pendingQty/status and both proceed. Only ever called with a transaction client.
async function findByIdForUpdate(id, client) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE id = $1 FOR UPDATE`, [id]);
  return result.rows[0];
}

// MAX-based (not COUNT-based): COUNT(*)+1 silently collides with an ALREADY-USED number
// whenever the sequence has any gap (a deleted order, or simply not starting at 1 - which
// this table never did, its first real row was 000002) - the UNIQUE constraint on soNo then
// makes every create() fail with a raw Postgres error instead of a real number. Taking the
// highest existing numeric suffix instead is immune to gaps.
async function getNextSoNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("soNo" FROM 9) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "soNo" ~ $1`,
    [`^SO-${year}-[0-9]+$`]
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `SO-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function create(soNo, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "soNo", "customerName", "customerGstNo", "orderDate", "deliveryDate", "deliveryAddress",
      status, "paymentStatus", "paidAmount", "purchaseOrderRef", items,
      "totalItems", "totalQty", "subTotal", "discountAmount", "gstAmount", "grandTotal", remarks, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *`,
    [
      soNo,
      fields.customerName,
      fields.customerGstNo,
      fields.orderDate,
      fields.deliveryDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
      fields.purchaseOrderRef,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.grandTotal,
      fields.remarks,
      fields.createdBy,
    ]
  );
  return result.rows[0];
}

// Accepts an optional transaction client (`db`), same reasoning as bom.model.js's update -
// dispatchSalesOrder/revertDispatch need this to commit or roll back atomically together
// with the Inventory stock adjustments.
async function update(id, fields, db = pool) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
      "customerName" = $1, "customerGstNo" = $2, "orderDate" = $3, "deliveryDate" = $4, "deliveryAddress" = $5,
      status = $6, "paymentStatus" = $7, "paidAmount" = $8, "purchaseOrderRef" = $9,
      items = $10, "totalItems" = $11, "totalQty" = $12,
      "subTotal" = $13, "discountAmount" = $14, "gstAmount" = $15, "grandTotal" = $16,
      remarks = $17, "createdBy" = $18, "updatedAt" = now()
    WHERE id = $19
    RETURNING *`,
    [
      fields.customerName,
      fields.customerGstNo,
      fields.orderDate,
      fields.deliveryDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
      fields.purchaseOrderRef,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.grandTotal,
      fields.remarks,
      fields.createdBy,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

// Existence check used by createSalesOrder to validate a user-typed soNo (the field is
// editable at create time) isn't already taken.
async function findBySoNo(soNo) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "soNo" = $1`, [soNo]);
  return result.rows[0];
}

module.exports = { getAll, findById, findByIdForUpdate, findBySoNo, getNextSoNo, create, update, remove };
