const express = require('express');
const {
  getSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  startProcessing,
  dispatchSalesOrder,
  revertDispatch,
  cancelSalesOrder,
  deleteSalesOrder,
} = require('../controllers/salesOrder.controller');

const router = express.Router();

router.get('/', getSalesOrders);
router.post('/', createSalesOrder);
router.put('/:id', updateSalesOrder);
router.post('/:id/confirm', confirmSalesOrder);
router.post('/:id/start-processing', startProcessing);
router.post('/:id/dispatch', dispatchSalesOrder);
router.post('/:id/revert-dispatch', revertDispatch);
router.post('/:id/cancel', cancelSalesOrder);
router.delete('/:id', deleteSalesOrder);

module.exports = router;
