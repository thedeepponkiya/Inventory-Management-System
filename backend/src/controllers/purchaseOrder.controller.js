const { sendServerError } = require('../utils/errorResponse');
const PurchaseOrderModel = require('../models/purchaseOrder.model');
const PurchaseOrderPaymentModel = require('../models/purchaseOrderPayment.model');
const MaterialInwardModel = require('../models/materialInward.model');
const { computeOrderTotals, derivePaymentStatus } = require('../utils/orderTotals');
const CustomFieldService = require('../services/customField.service');

const VALID_STATUSES = ['Draft', 'Sent', 'Received', 'Cancelled'];

// Only ever reachable via a direct API call: PurchaseOrderForm.tsx's Status dropdown is
// disabled once a PO isn't Draft (a still-Draft PO can freely move to any of the 4 statuses
// from that dropdown, matching the permissiveness below), and once Sent, the only other
// status-changing UI action is the dedicated Cancel button, which sends exactly a
// Sent->Cancelled transition. Most important to block: Received->Cancelled, which would
// desync the PO's items forever - resyncPurchaseOrderTotals (materialInward.controller.js)
// explicitly bails out for a Cancelled PO, so its receivedQty/pendingQty would be frozen at
// whatever they were and never reflect the Material Inward records that already exist
// against it.
const ALLOWED_PO_STATUS_TRANSITIONS = {
  Draft: ['Draft', 'Sent', 'Received', 'Cancelled'],
  Sent: ['Sent', 'Cancelled'],
  Received: ['Received'],
  Cancelled: ['Cancelled'],
};

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
    sendServerError(res, err);
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

    // Honors a user-typed PO No. (editable at create time) if provided and not already taken -
    // re-checked here rather than trusted from the previewed value shown in the form, since
    // another PO could have claimed it in the meantime. Falls back to auto-generating one,
    // same as before, when the field was left blank.
    let poNo = req.body.poNo ? String(req.body.poNo).trim() : '';
    if (poNo) {
      if (await PurchaseOrderModel.findByPoNo(poNo)) {
        return res.status(400).json({ status: false, message: `PO No. "${poNo}" is already in use - choose a different one`, data: null });
      }
    } else {
      poNo = await PurchaseOrderModel.getNextPoNo();
    }
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
      // Derived from the authenticated session, not trusted from the request body - the
      // frontend never actually sent this, which is why every record showed the literal
      // 'Admin User' fallback regardless of who was actually logged in.
      createdBy: req.user.userName,
    };

    const created = await PurchaseOrderModel.create(poNo, fields);
    await CustomFieldService.saveValues('purchaseOrder', created.id, req.body.customFields);
    const withCustomFields = await PurchaseOrderModel.findById(created.id);
    res.status(201).json({ status: true, message: 'Purchase order created successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
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
    if (req.body.status && req.body.status !== existing.status) {
      const allowed = ALLOWED_PO_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({ status: false, message: `Cannot change status from ${existing.status} to ${req.body.status}`, data: null });
      }
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
      // Never taken from the request body - the creator is established once, at create time,
      // from the authenticated session, and no edit should ever rewrite it.
      // PurchaseOrderForm.tsx sends a hard-coded 'Admin User' in its payload for both create
      // and update, so honouring the body here silently replaced the real creator with that
      // literal string on every single edit. Same reasoning as the create path's
      // req.user.userName - client-supplied identity fields aren't trusted.
      createdBy: existing.createdBy,
    };

    await PurchaseOrderModel.update(id, fields);
    await CustomFieldService.saveValues('purchaseOrder', id, body.customFields);
    const withCustomFields = await PurchaseOrderModel.findById(id);
    res.json({ status: true, message: 'Purchase order updated successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deletePurchaseOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await PurchaseOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Purchase order not found', data: null });
    }
    // ims_material_inward."purchaseOrderId" references this table with no ON DELETE clause
    // (default RESTRICT), so deleting a PO that already has receipts against it would
    // otherwise throw a raw, unhandled Postgres FK-violation straight back to the client -
    // this gives a clean, actionable message instead, same reasoning as deleteSalesOrder's
    // status guard.
    const inwardCount = await MaterialInwardModel.countByPurchaseOrder(id);
    if (inwardCount > 0) {
      return res.status(400).json({ status: false, message: 'This purchase order has Material Inward records against it and cannot be deleted - delete those first', data: null });
    }

    await PurchaseOrderModel.remove(id);
    res.json({ status: true, message: 'Purchase order deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder };
