const pool = require('../config/db');

const TABLE = 'ims_purchase_order';

// "payments" is aggregated in here (rather than fetched separately by the frontend) so the
// Transaction History tab gets its data for free from the same global fetch-all-POs call
// AppContext already makes on load - no extra per-page fetch pattern needed, matching how
// "items" is already embedded directly on every PO row. COALESCE(..., '[]') so a PO with no
// payments yet gets an empty array instead of a SQL NULL.
const SELECT_WITH_VENDOR = `
  SELECT po.*, v."vendorName",
    COALESCE(
      (SELECT json_agg(p.* ORDER BY p."paymentDate" ASC, p."createdAt" ASC)
       FROM ims_purchase_order_payments p WHERE p."poId" = po.id),
      '[]'
    ) AS payments
  FROM ${TABLE} po
  LEFT JOIN ims_vendor v ON v.id = po."vendorId"
`;

async function getAll() {
  const result = await pool.query(`${SELECT_WITH_VENDOR} ORDER BY po.id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_VENDOR} WHERE po.id = $1`, [id]);
  return result.rows[0];
}

// MAX-based (not COUNT-based) - see salesOrder.model.js's getNextSoNo for why COUNT(*)+1
// silently collides with an already-used number whenever the sequence has any gap.
async function getNextPoNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("poNo" FROM 9) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "poNo" ~ $1`,
    [`^PO-${year}-[0-9]+$`]
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `PO-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function create(poNo, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "poNo", "vendorId", "poDate", "expectedDeliveryDate", "shippingDate", "deliveryAddress", status,
      "paymentStatus", "paidAmount", items,
      "totalItems", "totalQty", "subTotal", "discountAmount", "gstAmount",
      "grandTotal", remarks, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      poNo,
      fields.vendorId,
      fields.poDate,
      fields.expectedDeliveryDate,
      fields.shippingDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
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

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "vendorId" = $1, "poDate" = $2, "expectedDeliveryDate" = $3, "shippingDate" = $4, "deliveryAddress" = $5, status = $6,
      "paymentStatus" = $7, "paidAmount" = $8,
      items = $9, "totalItems" = $10, "totalQty" = $11, "subTotal" = $12, "discountAmount" = $13,
      "gstAmount" = $14, "grandTotal" = $15,
      remarks = $16, "createdBy" = $17, "updatedAt" = now()
    WHERE id = $18
    RETURNING *`,
    [
      fields.vendorId,
      fields.poDate,
      fields.expectedDeliveryDate,
      fields.shippingDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
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

module.exports = { getAll, findById, getNextPoNo, create, update, remove };
