const PurchaseOrderModel = require('../models/purchaseOrder.model');
const PurchaseOrderPaymentModel = require('../models/purchaseOrderPayment.model');
const { computeOrderTotals, derivePaymentStatus } = require('../utils/orderTotals');

const VALID_STATUSES = ['Draft', 'Sent', 'Received', 'Cancelled'];

// Mirrors salesOrder.controller.js's findDuplicateSkuId - materialInward.controller.js's
// resyncPurchaseOrderTotals matches a PO line to its received quantity by skuId, so two PO
// lines sharing a SKU would make that matching ambiguous (both lines would get credited with
// the combined received quantity). Rejecting duplicates at write-time closes that off.
function findDuplicateSkuId(items) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.skuId)) return item.skuId;
    seen.add(item.skuId);
  }
  return null;
}

async function getPurchaseOrders(req, res) {
  try {
    const purchaseOrders = await PurchaseOrderModel.getAll();
    res.json({ status: true, message: 'Purchase orders fetched successfully', data: purchaseOrders });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createPurchaseOrder(req, res) {
  try {
    const { vendorId, poDate } = req.body;
    if (!vendorId || !poDate) {
      return res.status(400).json({ status: false, message: 'vendorId and poDate are required', data: null });
    }
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ status: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}`, data: null });
    }
    const duplicateSkuId = findDuplicateSkuId(req.body.items || []);
    if (duplicateSkuId) {
      return res.status(400).json({ status: false, message: `This order has more than one line for the same item (${duplicateSkuId}) - combine them into a single line`, data: null });
    }

    const poNo = await PurchaseOrderModel.getNextPoNo();
    const items = req.body.items || [];
    const totals = computeOrderTotals(items);
    // A brand-new PO can't have any payment transactions yet - Transaction History entries
    // are only addable once the PO itself has an id (see purchaseOrderPayment.controller.js) -
    // so paidAmount always starts at 0 here regardless of what the client sends.
    const paidAmount = 0;
    const fields = {
      vendorId,
      poDate,
      expectedDeliveryDate: req.body.expectedDeliveryDate || null,
      shippingDate: req.body.shippingDate || null,
      deliveryAddress: req.body.deliveryAddress || null,
      status: req.body.status || 'Draft',
      paymentStatus: derivePaymentStatus(paidAmount, totals.grandTotal),
      paidAmount,
      items,
      ...totals,
      remarks: req.body.remarks || null,
      createdBy: req.body.createdBy || 'Admin User',
    };

    const created = await PurchaseOrderModel.create(poNo, fields);
    res.status(201).json({ status: true, message: 'Purchase order created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updatePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await PurchaseOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }
    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ status: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}`, data: null });
    }
    // Matches Sales Order's identical guard - the frontend already makes the Items table
    // read-only once a PO isn't Draft (and omits items from its own update payload when
    // locked, see PurchaseOrderForm.tsx's handleSave), this is the server-side backstop so a
    // direct API call can't bypass that and edit locked line items.
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
    const items = body.items ?? existing.items;
    const totals = computeOrderTotals(items);
    // paidAmount is never taken from the client here either way now - it's always the real
    // sum of this PO's Transaction History rows (kept in sync by
    // purchaseOrderPayment.controller.js's addPayment/deletePayment), so a stale local value
    // in the main form (or a direct API call) can't overwrite it out of step with reality.
    const paidAmount = await PurchaseOrderPaymentModel.getSumByPoId(id);
    const fields = {
      vendorId: body.vendorId ?? existing.vendorId,
      poDate: body.poDate ?? existing.poDate,
      expectedDeliveryDate: body.expectedDeliveryDate ?? existing.expectedDeliveryDate,
      shippingDate: body.shippingDate ?? existing.shippingDate,
      deliveryAddress: body.deliveryAddress ?? existing.deliveryAddress,
      status: body.status ?? existing.status,
      // Derived from paidAmount vs. the recomputed grandTotal - see derivePaymentStatus.
      paymentStatus: derivePaymentStatus(paidAmount, totals.grandTotal),
      paidAmount,
      items,
      ...totals,
      remarks: body.remarks ?? existing.remarks,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await PurchaseOrderModel.update(id, fields);
    res.json({ status: true, message: 'Purchase order updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deletePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await PurchaseOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }

    await PurchaseOrderModel.remove(id);
    res.json({ status: true, message: 'Purchase order deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder };
