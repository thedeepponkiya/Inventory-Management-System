const MaterialInwardModel = require('../models/materialInward.model');
const PurchaseOrderModel = require('../models/purchaseOrder.model');
const RawSkuModel = require('../models/rawSku.model');
const { createInvoiceFromMaterialInward } = require('./invoice.controller');
const { computeOrderTotals } = require('../utils/orderTotals');

// computeOrderTotals's grandTotal (subTotal - discount + gst) doesn't know about Material
// Inward's own freightCharge/otherCharges, which aren't derived from items - they're real
// user-entered charges layered on top, so they're added back in here rather than trusted
// as-sent like every other total used to be.
function computeInwardTotals(items, freightCharge, otherCharges) {
  const base = computeOrderTotals(items);
  const freight = Number(freightCharge) || 0;
  const other = Number(otherCharges) || 0;
  return { ...base, grandTotal: Math.round((base.grandTotal + freight + other) * 100) / 100 };
}

// Only accepted quantity becomes usable Raw SKU stock - rejected quantity failed quality
// check and was never previously reflected anywhere (this whole function was missing before,
// meaning Raw SKU currentStock never moved on receiving at all). `sign` is 1 to apply a set
// of items' stock and -1 to reverse it (used by update/delete so edits/deletes never leave a
// stale delta behind).
async function applyStockForItems(items, sign) {
  for (const item of items) {
    const qty = Number(item.acceptedQty ?? item.receivedQty ?? 0);
    if (!item.skuCode || !qty) continue;
    await RawSkuModel.adjustStockBySkuCode(item.skuCode, sign * qty);
  }
}

// Inward No. mirrors the linked Purchase Order's number (per the user's ask), since a
// Material Inward is the execution of that PO, not an independent transaction. "inwardNo"
// still has a UNIQUE constraint though, so a second/third inward against the same PO gets
// a "-2"/"-3" suffix instead of colliding with the first. No PO linked -> falls back to the
// existing MI-{year}-{seq} auto-generation.
async function generateInwardNo(purchaseOrderId, purchaseOrderNo) {
  if (!purchaseOrderId || !purchaseOrderNo) {
    return MaterialInwardModel.getNextInwardNo();
  }
  const existingCount = await MaterialInwardModel.countByPurchaseOrder(purchaseOrderId);
  return existingCount === 0 ? purchaseOrderNo : `${purchaseOrderNo}-${existingCount + 1}`;
}

// Material Inward is the execution of an approved Purchase Order, so the PO's own
// receivedQty/pendingQty/status must reflect reality after every inward write. This
// recomputes from scratch (sums every live inward against the PO) rather than
// accumulating deltas, so edits/deletes never risk double-counting.
async function resyncPurchaseOrderTotals(purchaseOrderId) {
  if (!purchaseOrderId) return;

  const po = await PurchaseOrderModel.findById(purchaseOrderId);
  if (!po || po.status === 'Cancelled') return;

  const allInwards = await MaterialInwardModel.getAll();
  const relevantInwards = allInwards.filter((mi) => mi.purchaseOrderId === purchaseOrderId);
  const relevantItems = relevantInwards.flatMap((mi) => mi.items);

  // Matched by skuId, not itemName - two PO lines could share a display name (two separate
  // batches of the same raw material ordered on different lines), which would make a
  // name-based match ambiguous and double-count a single receipt against both lines.
  // purchaseOrder.controller.js now rejects duplicate skuIds on a PO at write-time, so skuId
  // is a reliable per-line key here.
  const updatedItems = po.items.map((item) => {
    const receivedQty = relevantItems
      .filter((mi) => mi.skuId === item.skuId)
      .reduce((sum, mi) => sum + mi.receivedQty, 0);
    return { ...item, receivedQty, pendingQty: item.orderedQty - receivedQty };
  });
  const hasAnyInward = relevantInwards.length > 0;

  // Only the Sent<->Received transition is auto-managed (so a later edit/delete that
  // un-fulfills a PO correctly reverts it, not just moves status forward one-way). Draft/
  // Cancelled are left alone - they aren't reachable from Material Inward's PO picker
  // anyway (it filters those out), but this keeps the auto-logic from ever overriding them.
  // Saving any Material Inward against a PO (even a partial receipt) marks it Received;
  // removing the last inward against it reverts it back to Sent.
  let status = po.status;
  if (po.status === 'Sent' || po.status === 'Received') {
    status = hasAnyInward ? 'Received' : 'Sent';
  }

  await PurchaseOrderModel.update(purchaseOrderId, {
    vendorId: po.vendorId,
    poDate: po.poDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    deliveryAddress: po.deliveryAddress,
    paymentTerms: po.paymentTerms,
    status,
    paymentStatus: po.paymentStatus,
    paidAmount: po.paidAmount,
    currency: po.currency,
    items: updatedItems,
    totalItems: po.totalItems,
    totalQty: po.totalQty,
    subTotal: po.subTotal,
    discountAmount: po.discountAmount,
    gstAmount: po.gstAmount,
    grandTotal: po.grandTotal,
    remarks: po.remarks,
    createdBy: po.createdBy,
    approvedBy: po.approvedBy,
    approvedAt: po.approvedAt,
  });
}

async function getMaterialInwards(req, res) {
  try {
    const materialInwards = await MaterialInwardModel.getAll();
    res.json({ status: true, message: 'Material inwards fetched successfully', data: materialInwards });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createMaterialInward(req, res) {
  try {
    const { vendorId, warehouseId, receivedDate } = req.body;
    if (!vendorId || !warehouseId || !receivedDate) {
      return res.status(400).json({ status: false, message: 'vendorId, warehouseId and receivedDate are required', data: null });
    }

    const inwardNo = await generateInwardNo(req.body.purchaseOrderId || null, req.body.purchaseOrderNo || null);
    const items = req.body.items || [];
    const freightCharge = req.body.freightCharge || 0;
    const otherCharges = req.body.otherCharges || 0;
    const totals = computeInwardTotals(items, freightCharge, otherCharges);
    const fields = {
      purchaseOrderId: req.body.purchaseOrderId || null,
      purchaseOrderNo: req.body.purchaseOrderNo || null,
      vendorId,
      vendorName: req.body.vendorName || null,
      receivedDate,
      invoiceNo: req.body.invoiceNo || null,
      invoiceDate: req.body.invoiceDate || null,
      challanNo: req.body.challanNo || null,
      vehicleNo: req.body.vehicleNo || null,
      warehouseId,
      items,
      ...totals,
      freightCharge,
      otherCharges,
      remarks: req.body.remarks || null,
      receivedBy: req.body.receivedBy || 'Admin User',
    };

    const created = await MaterialInwardModel.create(inwardNo, fields);
    await applyStockForItems(created.items, 1);
    await resyncPurchaseOrderTotals(created.purchaseOrderId);
    try {
      // Best-effort, matching resyncPurchaseOrderTotals's style: the Material Inward save
      // must succeed regardless of whether invoice auto-generation works.
      await createInvoiceFromMaterialInward(created);
    } catch (invoiceErr) {
      console.error('Failed to auto-generate invoice for material inward', created.id, invoiceErr);
    }
    res.status(201).json({ status: true, message: 'Material inward created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateMaterialInward(req, res) {
  try {
    const { id } = req.params;
    const existing = await MaterialInwardModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Material inward not found', data: null });
    }

    const body = req.body;
    const items = body.items ?? existing.items;
    const freightCharge = body.freightCharge ?? existing.freightCharge;
    const otherCharges = body.otherCharges ?? existing.otherCharges;
    const totals = computeInwardTotals(items, freightCharge, otherCharges);
    const fields = {
      purchaseOrderId: body.purchaseOrderId ?? existing.purchaseOrderId,
      purchaseOrderNo: body.purchaseOrderNo ?? existing.purchaseOrderNo,
      vendorId: body.vendorId ?? existing.vendorId,
      vendorName: body.vendorName ?? existing.vendorName,
      receivedDate: body.receivedDate ?? existing.receivedDate,
      invoiceNo: body.invoiceNo ?? existing.invoiceNo,
      invoiceDate: body.invoiceDate ?? existing.invoiceDate,
      challanNo: body.challanNo ?? existing.challanNo,
      vehicleNo: body.vehicleNo ?? existing.vehicleNo,
      warehouseId: body.warehouseId ?? existing.warehouseId,
      items,
      ...totals,
      freightCharge,
      otherCharges,
      remarks: body.remarks ?? existing.remarks,
      receivedBy: body.receivedBy ?? existing.receivedBy,
    };

    const updated = await MaterialInwardModel.update(id, fields);
    // Reverse the old items' stock effect and re-apply the new items' effect, rather than
    // diffing - simplest thing that's correct even when SKUs/quantities/line count all
    // change between the old and new items array.
    await applyStockForItems(existing.items, -1);
    await applyStockForItems(updated.items, 1);
    await resyncPurchaseOrderTotals(updated.purchaseOrderId);
    if (existing.purchaseOrderId && existing.purchaseOrderId !== updated.purchaseOrderId) {
      await resyncPurchaseOrderTotals(existing.purchaseOrderId);
    }
    res.json({ status: true, message: 'Material inward updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteMaterialInward(req, res) {
  try {
    const { id } = req.params;
    const existing = await MaterialInwardModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Material inward not found', data: null });
    }

    await MaterialInwardModel.remove(id);
    await applyStockForItems(existing.items, -1);
    await resyncPurchaseOrderTotals(existing.purchaseOrderId);
    res.json({ status: true, message: 'Material inward deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getMaterialInwards, createMaterialInward, updateMaterialInward, deleteMaterialInward };
