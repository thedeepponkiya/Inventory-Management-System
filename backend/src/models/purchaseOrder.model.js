const pool = require('../config/db');

const TABLE = 'ims_purchase_order';

const SELECT_WITH_VENDOR = `
  SELECT po.*, v."vendorName"
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

async function getNextPoNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE} WHERE "poNo" LIKE $1`, [`PO-${year}-%`]);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `PO-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function create(poNo, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "poNo", "vendorId", "poDate", "expectedDeliveryDate", "deliveryAddress", "paymentTerms", status, items,
      "totalItems", "totalQty", "subTotal", "discountAmount", "gstAmount",
      "grandTotal", remarks, "createdBy", "approvedBy", "approvedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      poNo,
      fields.vendorId,
      fields.poDate,
      fields.expectedDeliveryDate,
      fields.deliveryAddress,
      fields.paymentTerms,
      fields.status,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.grandTotal,
      fields.remarks,
      fields.createdBy,
      fields.approvedBy,
      fields.approvedAt,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "vendorId" = $1, "poDate" = $2, "expectedDeliveryDate" = $3, "deliveryAddress" = $4, "paymentTerms" = $5, status = $6,
      items = $7, "totalItems" = $8, "totalQty" = $9, "subTotal" = $10, "discountAmount" = $11,
      "gstAmount" = $12, "grandTotal" = $13,
      remarks = $14, "createdBy" = $15, "approvedBy" = $16, "approvedAt" = $17, "updatedAt" = now()
    WHERE id = $18
    RETURNING *`,
    [
      fields.vendorId,
      fields.poDate,
      fields.expectedDeliveryDate,
      fields.deliveryAddress,
      fields.paymentTerms,
      fields.status,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.grandTotal,
      fields.remarks,
      fields.createdBy,
      fields.approvedBy,
      fields.approvedAt,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, getNextPoNo, create, update, remove };
