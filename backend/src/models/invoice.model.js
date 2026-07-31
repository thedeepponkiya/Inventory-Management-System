const pool = require('../config/db');

const TABLE = 'ims_invoices';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function getNextInvoiceNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE} WHERE "invoiceNo" LIKE $1`, [`INV-${year}-%`]);
  const nextSeq = Number(result.rows[0].count) + 1;
  return `INV-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function create(invoiceNo, fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (
      "invoiceNo", "invoiceDate", "invoiceType", "referenceNo", "materialInwardNo", "customerSupplier",
      location, "totalQty", "subTotal", "unitPrice", "discountPercent", "discountAmount", "gstPercent",
      "gstAmount", "freightCharge", "otherCharges", "grandTotal", "paidAmount", "dueAmount", "dueDate",
      "paymentTerms", "paymentStatus", remarks, "createdBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    RETURNING *`,
    [
      invoiceNo,
      fields.invoiceDate,
      fields.invoiceType,
      fields.referenceNo,
      fields.materialInwardNo,
      fields.customerSupplier,
      fields.location,
      fields.totalQty,
      fields.subTotal,
      fields.unitPrice,
      fields.discountPercent,
      fields.discountAmount,
      fields.gstPercent,
      fields.gstAmount,
      fields.freightCharge,
      fields.otherCharges,
      fields.grandTotal,
      fields.paidAmount,
      fields.dueAmount,
      fields.dueDate,
      fields.paymentTerms,
      fields.paymentStatus,
      fields.remarks,
      fields.createdBy,
    ]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      "invoiceDate" = $1, "invoiceType" = $2, "referenceNo" = $3, "materialInwardNo" = $4, "customerSupplier" = $5,
      location = $6, "totalQty" = $7, "subTotal" = $8, "unitPrice" = $9, "discountPercent" = $10,
      "discountAmount" = $11, "gstPercent" = $12, "gstAmount" = $13, "freightCharge" = $14, "otherCharges" = $15,
      "grandTotal" = $16, "paidAmount" = $17, "dueAmount" = $18, "dueDate" = $19, "paymentTerms" = $20,
      "paymentStatus" = $21, remarks = $22, "createdBy" = $23, "updatedAt" = now()
    WHERE id = $24
    RETURNING *`,
    [
      fields.invoiceDate,
      fields.invoiceType,
      fields.referenceNo,
      fields.materialInwardNo,
      fields.customerSupplier,
      fields.location,
      fields.totalQty,
      fields.subTotal,
      fields.unitPrice,
      fields.discountPercent,
      fields.discountAmount,
      fields.gstPercent,
      fields.gstAmount,
      fields.freightCharge,
      fields.otherCharges,
      fields.grandTotal,
      fields.paidAmount,
      fields.dueAmount,
      fields.dueDate,
      fields.paymentTerms,
      fields.paymentStatus,
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

module.exports = { getAll, findById, getNextInvoiceNo, create, update, remove };
