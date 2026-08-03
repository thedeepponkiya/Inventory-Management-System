const MaterialInwardModel = require('../models/materialInward.model');
const PurchaseOrderModel = require('../models/purchaseOrder.model');
const { createInvoiceFromMaterialInward } = require('./invoice.controller');

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

  const updatedItems = po.items.map((item) => {
    const receivedQty = relevantItems
      .filter((mi) => mi.itemName === item.itemName)
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
      items: req.body.items || [],
      totalItems: req.body.totalItems || 0,
      totalQty: req.body.totalQty || 0,
      subTotal: req.body.subTotal || 0,
      discountAmount: req.body.discountAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      freightCharge: req.body.freightCharge || 0,
      otherCharges: req.body.otherCharges || 0,
      grandTotal: req.body.grandTotal || 0,
      remarks: req.body.remarks || null,
      receivedBy: req.body.receivedBy || 'Admin User',
    };

    const created = await MaterialInwardModel.create(inwardNo, fields);
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
      items: body.items ?? existing.items,
      totalItems: body.totalItems ?? existing.totalItems,
      totalQty: body.totalQty ?? existing.totalQty,
      subTotal: body.subTotal ?? existing.subTotal,
      discountAmount: body.discountAmount ?? existing.discountAmount,
      gstAmount: body.gstAmount ?? existing.gstAmount,
      freightCharge: body.freightCharge ?? existing.freightCharge,
      otherCharges: body.otherCharges ?? existing.otherCharges,
      grandTotal: body.grandTotal ?? existing.grandTotal,
      remarks: body.remarks ?? existing.remarks,
      receivedBy: body.receivedBy ?? existing.receivedBy,
    };

    const updated = await MaterialInwardModel.update(id, fields);
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
    await resyncPurchaseOrderTotals(existing.purchaseOrderId);
    res.json({ status: true, message: 'Material inward deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getMaterialInwards, createMaterialInward, updateMaterialInward, deleteMaterialInward };
