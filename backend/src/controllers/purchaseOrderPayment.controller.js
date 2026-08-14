const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const PurchaseOrderModel = require('../models/purchaseOrder.model');
const PurchaseOrderPaymentModel = require('../models/purchaseOrderPayment.model');
const { derivePaymentStatus } = require('../utils/orderTotals');

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Other'];

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function getPayments(req, res) {
  try {
    const { id } = req.params;
    const po = await PurchaseOrderModel.findById(id);
    if (!po) {
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }
    const payments = await PurchaseOrderPaymentModel.getByPoId(id);
    res.json({ status: true, message: 'Payments fetched successfully', data: payments });
  } catch (err) {
    sendServerError(res, err);
  }
}

// Records one payment transaction and recomputes the PO's paidAmount/paymentStatus from the
// resulting total (sum of every payment row, not the amount just added, in case the two ever
// drifted) - both happen inside a single transaction with a row lock on the PO (SELECT ...
// FOR UPDATE) so two concurrent "Add Payment" submissions can't both read the same starting
// total and together push paidAmount past grandTotal. Same class of race this app already
// guards against in salesOrder.controller.js's dispatchSalesOrder.
async function addPayment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const poResult = await client.query('SELECT * FROM ims_purchase_order WHERE id = $1 FOR UPDATE', [id]);
    const po = poResult.rows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }

    const amount = round2(req.body.amount);
    if (!amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Amount must be greater than 0', data: null });
    }
    if (!req.body.paymentDate) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'paymentDate is required', data: null });
    }
    if (req.body.paymentMethod && !PAYMENT_METHODS.includes(req.body.paymentMethod)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`, data: null });
    }

    const currentPaid = await PurchaseOrderPaymentModel.getSumByPoId(id, client);
    const grandTotal = round2(po.grandTotal);
    const remaining = round2(grandTotal - currentPaid);
    if (amount > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Amount exceeds the remaining balance due (Rs. ${remaining.toLocaleString('en-IN')})`,
        data: null,
      });
    }

    await PurchaseOrderPaymentModel.create(
      {
        poId: id,
        amount,
        paymentDate: req.body.paymentDate,
        paymentMethod: req.body.paymentMethod || null,
        remarks: req.body.remarks || null,
        // Whoever is actually recording this payment right now, from the authenticated
        // session - not trusted from the request body. approvedBy stays request-driven: it's
        // a free-text/autocomplete field on the form naming a DIFFERENT person (the approver),
        // not necessarily whoever is logged in and recording the payment.
        recordedBy: req.user.userName,
        paymentTerms: req.body.paymentTerms || null,
        approvedBy: req.body.approvedBy || null,
        approvedAt: req.body.approvedAt || null,
      },
      client
    );

    const newPaidAmount = round2(currentPaid + amount);
    const newPaymentStatus = derivePaymentStatus(newPaidAmount, grandTotal);
    await client.query(
      `UPDATE ims_purchase_order SET "paidAmount" = $1, "paymentStatus" = $2, "updatedAt" = now() WHERE id = $3`,
      [newPaidAmount, newPaymentStatus, id]
    );
    await client.query('COMMIT');

    const updated = await PurchaseOrderModel.findById(id);
    res.status(201).json({ status: true, message: 'Payment recorded successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Deletes one payment transaction and recomputes paidAmount/paymentStatus the same way
// addPayment does - same row-lock-then-recompute transaction pattern.
async function deletePayment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id, paymentId } = req.params;
    const poResult = await client.query('SELECT * FROM ims_purchase_order WHERE id = $1 FOR UPDATE', [id]);
    const po = poResult.rows[0];
    if (!po) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }

    const payment = await PurchaseOrderPaymentModel.findById(paymentId, client);
    if (!payment || String(payment.poId) !== String(id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Payment not found', data: null });
    }

    await PurchaseOrderPaymentModel.remove(paymentId, client);

    const newPaidAmount = await PurchaseOrderPaymentModel.getSumByPoId(id, client);
    const newPaymentStatus = derivePaymentStatus(newPaidAmount, round2(po.grandTotal));
    await client.query(
      `UPDATE ims_purchase_order SET "paidAmount" = $1, "paymentStatus" = $2, "updatedAt" = now() WHERE id = $3`,
      [newPaidAmount, newPaymentStatus, id]
    );
    await client.query('COMMIT');

    const updated = await PurchaseOrderModel.findById(id);
    res.json({ status: true, message: 'Payment deleted successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { getPayments, addPayment, deletePayment, PAYMENT_METHODS };
