const pool = require('../config/db');

const TABLE = 'ims_material_inward';

async function getAll(db = pool) {
  const result = await db.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id, db = pool) {
  const result = await db.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

// MAX-based (not COUNT-based) - see salesOrder.model.js's getNextSoNo for why COUNT(*)+1
// silently collides with an already-used number whenever the sequence has any gap. Only
// reached when there's no linked PO (see generateInwardNo in the controller, which mirrors
// the PO's own number when one is linked).
async function getNextInwardNo() {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("inwardNo" FROM 9) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "inwardNo" ~ $1`,
    [`^MI-${year}-[0-9]+$`]
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `MI-${year}-${String(nextSeq).padStart(6, '0')}`;
}

async function countByPurchaseOrder(purchaseOrderId) {
  const result = await pool.query(`SELECT COUNT(*) FROM ${TABLE} WHERE "purchaseOrderId" = $1`, [purchaseOrderId]);
  return Number(result.rows[0].count);
}

async function create(inwardNo, fields, db = pool) {
  const result = await db.query(
    `INSERT INTO ${TABLE} (
      "inwardNo", "purchaseOrderId", "purchaseOrderNo", "vendorId", "vendorName", "receivedDate",
      "invoiceNo", "invoiceDate", "challanNo", "vehicleNo", "warehouseId", items,
      "totalItems", "totalQty", "subTotal", "discountAmount", "gstAmount", "freightCharge",
      "otherCharges", "grandTotal", remarks, "receivedBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *`,
    [
      inwardNo,
      fields.purchaseOrderId,
      fields.purchaseOrderNo,
      fields.vendorId,
      fields.vendorName,
      fields.receivedDate,
      fields.invoiceNo,
      fields.invoiceDate,
      fields.challanNo,
      fields.vehicleNo,
      fields.warehouseId,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.freightCharge,
      fields.otherCharges,
      fields.grandTotal,
      fields.remarks,
      fields.receivedBy,
    ]
  );
  return result.rows[0];
}

async function update(id, fields, db = pool) {
  const result = await db.query(
    `UPDATE ${TABLE} SET
      "purchaseOrderId" = $1, "purchaseOrderNo" = $2, "vendorId" = $3, "vendorName" = $4, "receivedDate" = $5,
      "invoiceNo" = $6, "invoiceDate" = $7, "challanNo" = $8, "vehicleNo" = $9, "warehouseId" = $10, items = $11,
      "totalItems" = $12, "totalQty" = $13, "subTotal" = $14, "discountAmount" = $15, "gstAmount" = $16,
      "freightCharge" = $17, "otherCharges" = $18, "grandTotal" = $19, remarks = $20, "receivedBy" = $21,
      "updatedAt" = now()
    WHERE id = $22
    RETURNING *`,
    [
      fields.purchaseOrderId,
      fields.purchaseOrderNo,
      fields.vendorId,
      fields.vendorName,
      fields.receivedDate,
      fields.invoiceNo,
      fields.invoiceDate,
      fields.challanNo,
      fields.vehicleNo,
      fields.warehouseId,
      JSON.stringify(fields.items),
      fields.totalItems,
      fields.totalQty,
      fields.subTotal,
      fields.discountAmount,
      fields.gstAmount,
      fields.freightCharge,
      fields.otherCharges,
      fields.grandTotal,
      fields.remarks,
      fields.receivedBy,
      id,
    ]
  );
  return result.rows[0];
}

async function remove(id, db = pool) {
  await db.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, getNextInwardNo, countByPurchaseOrder, create, update, remove };
