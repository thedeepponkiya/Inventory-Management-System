const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const SalesOrderModel = require('../models/salesOrder.model');
const SalesOrderPaymentModel = require('../models/salesOrderPayment.model');
const SalesOrderDispatchModel = require('../models/salesOrderDispatch.model');
const InventoryModel = require('../models/inventory.model');
const { createInvoiceFromSalesOrder } = require('./invoice.controller');
const { computeOrderTotals, derivePaymentStatus } = require('../utils/orderTotals');

// Dispatch (below) tracks ship quantity per line keyed by skuId, both in this controller's
// own shipMap and in the frontend's dispatch dialog - two lines sharing a SKU would silently
// collapse into a single entry, applying one line's ship quantity to both lines and deducting
// Inventory stock twice for a single quantity the user actually entered once. Rejecting
// duplicates at write-time (create/update) closes this off entirely rather than trying to
// keep every downstream consumer duplicate-safe.
function findDuplicateSkuId(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.skuId)) return item.skuId;
    seen.add(item.skuId);
  }
  return null;
}

async function getSalesOrders(req, res) {
  try {
    const salesOrders = await SalesOrderModel.getAll();
    res.json({ status: true, message: 'Sales orders fetched successfully', data: salesOrders });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createSalesOrder(req, res) {
  try {
    const { customerName, orderDate } = req.body;
    if (!customerName || !orderDate) {
      return res.status(400).json({ status: false, message: 'customerName and orderDate are required', data: null });
    }
    if (!req.body.customerGstNo) {
      return res.status(400).json({ status: false, message: 'customerGstNo is required', data: null });
    }

    const duplicateSkuId = findDuplicateSkuId(req.body.items || []);
    if (duplicateSkuId) {
      return res.status(400).json({ status: false, message: `This order has more than one line for the same item (${duplicateSkuId}) - combine them into a single line`, data: null });
    }

    // Honors a user-typed SO No. (editable at create time) if provided and not already taken -
    // re-checked here rather than trusted from the previewed value shown in the form, since
    // another SO could have claimed it in the meantime. Falls back to auto-generating one,
    // same as before, when the field was left blank.
    let soNo = req.body.soNo ? String(req.body.soNo).trim() : '';
    if (soNo) {
      if (await SalesOrderModel.findBySoNo(soNo)) {
        return res.status(400).json({ status: false, message: `SO No. "${soNo}" is already in use - choose a different one`, data: null });
      }
    } else {
      soNo = await SalesOrderModel.getNextSoNo();
    }
    // Every line starts fully pending - dispatchedQty only grows via the /dispatch action.
    const items = (req.body.items || []).map((item) => ({
      ...item,
      dispatchedQty: 0,
      pendingQty: item.orderedQty,
    }));
    const totals = computeOrderTotals(items);
    // A brand-new SO can't have any payment transactions yet - Transaction History entries
    // are only addable once the SO itself has an id (see salesOrderPayment.controller.js) -
    // so paidAmount always starts at 0 here regardless of what the client sends.
    const paidAmount = 0;
    const fields = {
      customerName,
      customerGstNo: req.body.customerGstNo || null,
      orderDate,
      deliveryDate: req.body.deliveryDate || null,
      deliveryAddress: req.body.deliveryAddress || null,
      status: 'Draft',
      paymentStatus: derivePaymentStatus(paidAmount, totals.grandTotal),
      paidAmount,
      purchaseOrderRef: req.body.purchaseOrderRef || null,
      items,
      ...totals,
      remarks: req.body.remarks || null,
      // Derived from the authenticated session, not trusted from the request body - see
      // purchaseOrder.controller.js's identical fix for why.
      createdBy: req.user.userName,
    };

    const created = await SalesOrderModel.create(soNo, fields);
    res.status(201).json({ status: true, message: 'Sales order created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Draft' && req.body.items) {
      return res.status(400).json({ status: false, message: 'Items can only be edited while the order is in Draft', data: null });
    }
    if (req.body.items) {
      const duplicateSkuId = findDuplicateSkuId(req.body.items);
      if (duplicateSkuId) {
        return res.status(400).json({ status: false, message: `This order has more than one line for the same item (${duplicateSkuId}) - combine them into a single line`, data: null });
      }
    }

    const body = req.body;
    const items = body.items
      ? body.items.map((item) => ({ ...item, dispatchedQty: 0, pendingQty: item.orderedQty }))
      : existing.items;
    const totals = computeOrderTotals(items);
    // paidAmount is never taken from the client - it's always the real sum of this SO's
    // Transaction History rows (kept in sync by salesOrderPayment.controller.js's addPayment/
    // deletePayment), so a stale local value in the main form (or a direct API call) can't
    // overwrite it out of step with reality.
    const paidAmount = await SalesOrderPaymentModel.getSumBySoId(id);
    const fields = {
      customerName: body.customerName ?? existing.customerName,
      customerGstNo: body.customerGstNo ?? existing.customerGstNo,
      orderDate: body.orderDate ?? existing.orderDate,
      deliveryDate: body.deliveryDate ?? existing.deliveryDate,
      deliveryAddress: body.deliveryAddress ?? existing.deliveryAddress,
      status: existing.status,
      // Derived from paidAmount vs. the recomputed grandTotal - see derivePaymentStatus.
      paymentStatus: derivePaymentStatus(paidAmount, totals.grandTotal),
      paidAmount,
      purchaseOrderRef: body.purchaseOrderRef ?? existing.purchaseOrderRef,
      items,
      ...totals,
      remarks: body.remarks ?? existing.remarks,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await SalesOrderModel.update(id, fields);
    res.json({ status: true, message: 'Sales order updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

// Confirming used to have no stock check at all - a Draft order could move all the way to
// Processing regardless of what was actually left in Inventory, and the customer would only
// find out at the very last step (Dispatch) that there wasn't enough stock, by which point
// packing/prep work may already be done. Checking here instead means "not enough stock" shows
// up as early as possible in the order's lifecycle. This checks each line's ordered quantity
// against Inventory's current quantity right now - it does NOT reserve stock against other
// orders that are already Confirmed/Processing but not yet dispatched (Inventory.quantity
// itself is only ever actually decremented at Dispatch, see dispatchSalesOrder below), so two
// orders can still both confirm successfully against the same limited stock; the real,
// row-locked deduction/rejection still happens at Dispatch time as the final source of truth.
async function confirmSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Draft') {
      return res.status(400).json({ status: false, message: 'Only a Draft order can be confirmed', data: null });
    }

    for (const item of existing.items) {
      const inventoryItem = await InventoryModel.findBySkuId(item.skuId);
      const available = Number(inventoryItem?.quantity) || 0;
      if (available < Number(item.orderedQty)) {
        return res.status(400).json({
          status: false,
          message: `Not enough stock in Inventory to confirm ${item.itemName} - ordered ${item.orderedQty} ${item.unit}, only ${available} ${item.unit} available`,
          data: null,
        });
      }
    }

    const updated = await SalesOrderModel.update(id, { ...existing, status: 'Confirmed' });
    res.json({ status: true, message: 'Sales order confirmed successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function startProcessing(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Confirmed') {
      return res.status(400).json({ status: false, message: 'Only a Confirmed order can start Processing', data: null });
    }

    const updated = await SalesOrderModel.update(id, { ...existing, status: 'Processing' });
    res.json({ status: true, message: 'Sales order moved to Processing', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

// Ships some or all of the still-pending quantity for one or more lines - deducts that
// exact quantity from each line's Inventory SKU (mirrors BOM's Dispatch step, but per-item
// and allowed to happen incrementally across multiple calls instead of one all-or-nothing
// shot). Status becomes "Dispatched" once every line's pendingQty reaches 0, otherwise
// "Partially Shipped".
//
// Runs inside a single transaction with row-level locks (SELECT ... FOR UPDATE) on the Sales
// Order itself and every Inventory SKU it ships: without this, two concurrent dispatch
// requests against the same order (or two orders sharing a SKU) could both read the same
// starting pendingQty/Inventory quantity, both pass validation, and both deduct - shipping
// more than was ordered or than actually exists in stock. Everything is still validated
// before any stock is touched, same as before.
async function dispatchSalesOrder(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await SalesOrderModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Processing' && existing.status !== 'Partially Shipped') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Only a Processing or Partially Shipped order can be dispatched', data: null });
    }

    const shipments = req.body.items;
    if (!Array.isArray(shipments) || shipments.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Provide at least one item to ship', data: null });
    }
    // Summed (not new Map(shipments.map(...)), which silently keeps only the LAST entry for
    // a repeated skuId and drops the rest) - a client-supplied payload with two entries for
    // the same skuId should combine them, not quietly lose one.
    const shipMap = new Map();
    for (const s of shipments) {
      shipMap.set(s.skuId, (shipMap.get(s.skuId) || 0) + (Number(s.shipQty) || 0));
    }

    // Validate everything before touching any stock, so a failure partway through never
    // leaves some lines shipped and others rejected.
    for (const item of existing.items) {
      const shipQty = shipMap.get(item.skuId) || 0;
      if (shipQty <= 0) continue;
      if (shipQty > Number(item.pendingQty)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ status: false, message: `Cannot ship more than the pending quantity for ${item.itemName}`, data: null });
      }
      const inventoryItem = await InventoryModel.findBySkuIdForUpdate(item.skuId, client);
      if (!inventoryItem || Number(inventoryItem.quantity) < shipQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ status: false, message: `Not enough stock in Inventory to ship ${item.itemName}`, data: null });
      }
    }

    const updatedItems = [];
    for (const item of existing.items) {
      const shipQty = shipMap.get(item.skuId) || 0;
      if (shipQty > 0) {
        await InventoryModel.adjustStockBySkuId(item.skuId, -shipQty, client);
      }
      updatedItems.push({
        ...item,
        dispatchedQty: Number(item.dispatchedQty) + shipQty,
        pendingQty: Number(item.pendingQty) - shipQty,
      });
    }

    const allShipped = updatedItems.every((item) => Number(item.pendingQty) <= 0);
    const updated = await SalesOrderModel.update(id, {
      ...existing,
      items: updatedItems,
      status: allShipped ? 'Dispatched' : 'Partially Shipped',
    }, client);

    // Dispatch History ledger row for this call - only the lines/quantities actually shipped
    // just now (shipMap), not the SO's full item list. Inserted in the same transaction as the
    // items/status update and stock deduction above, so it can never exist without them (or
    // vice versa) even if something later in this request fails.
    const dispatchedLineItems = existing.items
      .filter((item) => (shipMap.get(item.skuId) || 0) > 0)
      .map((item) => ({
        skuId: item.skuId,
        skuCode: item.skuCode,
        itemName: item.itemName,
        unit: item.unit,
        shipQty: shipMap.get(item.skuId),
      }));
    await SalesOrderDispatchModel.create({
      soId: id,
      dispatchDate: new Date().toISOString().slice(0, 10),
      items: dispatchedLineItems,
      dispatchedBy: req.user.userName,
    }, client);

    await client.query('COMMIT');

    // Best-effort, deliberately OUTSIDE the transaction and after COMMIT - dispatch must
    // succeed regardless of whether invoice auto-generation works, mirroring
    // materialInward.controller.js's createInvoiceFromMaterialInward treatment. Only the
    // quantity actually shipped in THIS call is invoiced (shipMap, not the full order), so a
    // partial shipment doesn't get billed for what's still pending.
    let invoiceWarning = null;
    const shippedItems = existing.items
      .filter((item) => (shipMap.get(item.skuId) || 0) > 0)
      .map((item) => ({ ...item, orderedQty: shipMap.get(item.skuId) }));
    if (shippedItems.length > 0) {
      try {
        await createInvoiceFromSalesOrder(updated, shippedItems);
      } catch (invoiceErr) {
        console.error('Failed to auto-generate invoice for sales order dispatch', updated.id, invoiceErr);
        invoiceWarning = 'Items dispatched successfully, but the Sales Invoice could not be auto-generated. Please create it manually from the Invoices page.';
      }
    }

    res.json({ status: true, message: 'Items dispatched successfully', data: updated, warning: invoiceWarning });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Undoes every shipment made so far on this order in one shot - restores each line's
// dispatchedQty back to Inventory and resets it to fully pending. Does not support
// reverting a single partial shipment out of several; only a full reset back to Processing.
// Same transaction + locking treatment as dispatchSalesOrder.
async function revertDispatch(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await SalesOrderModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Partially Shipped' && existing.status !== 'Dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Only a Partially Shipped or Dispatched order can be reverted', data: null });
    }

    const updatedItems = [];
    for (const item of existing.items) {
      const dispatchedQty = Number(item.dispatchedQty);
      if (dispatchedQty > 0) {
        await InventoryModel.adjustStockBySkuId(item.skuId, dispatchedQty, client);
      }
      updatedItems.push({ ...item, dispatchedQty: 0, pendingQty: item.orderedQty });
    }

    const updated = await SalesOrderModel.update(id, { ...existing, items: updatedItems, status: 'Processing' }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'Sales order reverted to Processing successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

async function cancelSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status === 'Partially Shipped' || existing.status === 'Dispatched') {
      return res.status(400).json({ status: false, message: 'Revert any shipped items before cancelling this order', data: null });
    }
    if (existing.status === 'Cancelled') {
      return res.status(400).json({ status: false, message: 'Order is already cancelled', data: null });
    }

    const updated = await SalesOrderModel.update(id, { ...existing, status: 'Cancelled' });
    res.json({ status: true, message: 'Sales order cancelled successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Draft') {
      return res.status(400).json({ status: false, message: 'Only a Draft order can be deleted', data: null });
    }

    await SalesOrderModel.remove(id);
    res.json({ status: true, message: 'Sales order deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = {
  getSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  startProcessing,
  dispatchSalesOrder,
  revertDispatch,
  cancelSalesOrder,
  deleteSalesOrder,
};
