const express = require('express');
const {
  getSalesOrders,
  getNextSoNo,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  dispatchSalesOrder,
  revertDispatch,
  cancelSalesOrder,
  deleteSalesOrder,
} = require('../controllers/salesOrder.controller');
const { getPayments, addPayment, deletePayment } = require('../controllers/salesOrderPayment.controller');

const router = express.Router();

router.get('/', getSalesOrders);
router.get('/next-so-no', getNextSoNo);
router.post('/', createSalesOrder);
router.put('/:id', updateSalesOrder);
router.post('/:id/confirm', confirmSalesOrder);
router.post('/:id/dispatch', dispatchSalesOrder);
router.post('/:id/revert-dispatch', revertDispatch);
router.post('/:id/cancel', cancelSalesOrder);
router.delete('/:id', deleteSalesOrder);

// Transaction History (Add Payment dialog) - mirrors purchaseOrder.routes.js's identical
// payment sub-routes, see salesOrderPayment.controller.js.
router.get('/:id/payments', getPayments);
router.post('/:id/payments', addPayment);
router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;
