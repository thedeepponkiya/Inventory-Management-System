const pool = require('../config/db');

const TABLE = 'ims_sales_order';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function getNextSoNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE} WHERE "soNo" LIKE $1`, [`SO-${year}-%`]);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `SO-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function create(soNo, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "soNo", "customerName", "customerCode", "orderDate", "deliveryDate", "deliveryAddress",
      status, "paymentStatus", "paidAmount", "paymentTerms", "purchaseOrderRef", currency, items,
      "totalItems", "totalQty", "subTotal", "discountAmount", "gstAmount", "grandTotal", remarks, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      soNo,
      fields.customerName,
      fields.customerCode,
      fields.orderDate,
      fields.deliveryDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
      fields.paymentTerms,
      fields.purchaseOrderRef,
      fields.currency,
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
      "customerName" = $1, "customerCode" = $2, "orderDate" = $3, "deliveryDate" = $4, "deliveryAddress" = $5,
      status = $6, "paymentStatus" = $7, "paidAmount" = $8, "paymentTerms" = $9, "purchaseOrderRef" = $10,
      currency = $11, items = $12, "totalItems" = $13, "totalQty" = $14,
      "subTotal" = $15, "discountAmount" = $16, "gstAmount" = $17, "grandTotal" = $18,
      remarks = $19, "createdBy" = $20, "updatedAt" = now()
    WHERE id = $21
    RETURNING *`,
    [
      fields.customerName,
      fields.customerCode,
      fields.orderDate,
      fields.deliveryDate,
      fields.deliveryAddress,
      fields.status,
      fields.paymentStatus,
      fields.paidAmount,
      fields.paymentTerms,
      fields.purchaseOrderRef,
      fields.currency,
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

module.exports = { getAll, findById, getNextSoNo, create, update, remove };
