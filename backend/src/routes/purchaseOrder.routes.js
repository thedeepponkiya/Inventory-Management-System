const express = require('express');
const { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } = require('../controllers/purchaseOrder.controller');
const { getPayments, addPayment, deletePayment } = require('../controllers/purchaseOrderPayment.controller');

const router = express.Router();

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

// Transaction History (Payment Details opens as a Dialog on this tab in the frontend) - each
// payment is its own row rather than one mutable "Paid Amount" field, see
// purchaseOrderPayment.controller.js.
router.get('/:id/payments', getPayments);
router.post('/:id/payments', addPayment);
router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;
