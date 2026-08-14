const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const SalesOrderModel = require('../models/salesOrder.model');
const SalesOrderPaymentModel = require('../models/salesOrderPayment.model');
const { derivePaymentStatus } = require('../utils/orderTotals');

// Exact mirror of purchaseOrderPayment.controller.js - see its comments for the full reasoning
// (row-locked-then-recompute transaction pattern, why the balance-due cap exists, etc.).
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Other'];

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function getPayments(req, res) {
  try {
    const { id } = req.params;
    const so = await SalesOrderModel.findById(id);
    if (!so) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    const payments = await SalesOrderPaymentModel.getBySoId(id);
    res.json({ status: true, message: 'Payments fetched successfully', data: payments });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function addPayment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const soResult = await client.query('SELECT * FROM ims_sales_order WHERE id = $1 FOR UPDATE', [id]);
    const so = soResult.rows[0];
    if (!so) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
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

    const currentPaid = await SalesOrderPaymentModel.getSumBySoId(id, client);
    const grandTotal = round2(so.grandTotal);
    const remaining = round2(grandTotal - currentPaid);
    if (amount > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Amount exceeds the remaining balance due (Rs. ${remaining.toLocaleString('en-IN')})`,
        data: null,
      });
    }

    await SalesOrderPaymentModel.create(
      {
        soId: id,
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
      `UPDATE ims_sales_order SET "paidAmount" = $1, "paymentStatus" = $2, "updatedAt" = now() WHERE id = $3`,
      [newPaidAmount, newPaymentStatus, id]
    );
    await client.query('COMMIT');

    const updated = await SalesOrderModel.findById(id);
    res.status(201).json({ status: true, message: 'Payment recorded successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

async function deletePayment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id, paymentId } = req.params;
    const soResult = await client.query('SELECT * FROM ims_sales_order WHERE id = $1 FOR UPDATE', [id]);
    const so = soResult.rows[0];
    if (!so) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }

    const payment = await SalesOrderPaymentModel.findById(paymentId, client);
    if (!payment || String(payment.soId) !== String(id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Payment not found', data: null });
    }

    await SalesOrderPaymentModel.remove(paymentId, client);

    const newPaidAmount = await SalesOrderPaymentModel.getSumBySoId(id, client);
    const newPaymentStatus = derivePaymentStatus(newPaidAmount, round2(so.grandTotal));
    await client.query(
      `UPDATE ims_sales_order SET "paidAmount" = $1, "paymentStatus" = $2, "updatedAt" = now() WHERE id = $3`,
      [newPaidAmount, newPaymentStatus, id]
    );
    await client.query('COMMIT');

    const updated = await SalesOrderModel.findById(id);
    res.json({ status: true, message: 'Payment deleted successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { getPayments, addPayment, deletePayment };
