const PurchaseOrderModel = require('../models/purchaseOrder.model');

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

    const poNo = await PurchaseOrderModel.getNextPoNo();
    const fields = {
      vendorId,
      poDate,
      expectedDeliveryDate: req.body.expectedDeliveryDate || null,
      deliveryAddress: req.body.deliveryAddress || null,
      paymentTerms: req.body.paymentTerms || null,
      status: req.body.status || 'Draft',
      items: req.body.items || [],
      totalItems: req.body.totalItems || 0,
      totalQty: req.body.totalQty || 0,
      subTotal: req.body.subTotal || 0,
      discountAmount: req.body.discountAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      grandTotal: req.body.grandTotal || 0,
      remarks: req.body.remarks || null,
      createdBy: req.body.createdBy || 'Admin User',
      approvedBy: req.body.approvedBy || null,
      approvedAt: req.body.approvedAt || null,
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

    const body = req.body;
    const fields = {
      vendorId: body.vendorId ?? existing.vendorId,
      poDate: body.poDate ?? existing.poDate,
      expectedDeliveryDate: body.expectedDeliveryDate ?? existing.expectedDeliveryDate,
      deliveryAddress: body.deliveryAddress ?? existing.deliveryAddress,
      paymentTerms: body.paymentTerms ?? existing.paymentTerms,
      status: body.status ?? existing.status,
      items: body.items ?? existing.items,
      totalItems: body.totalItems ?? existing.totalItems,
      totalQty: body.totalQty ?? existing.totalQty,
      subTotal: body.subTotal ?? existing.subTotal,
      discountAmount: body.discountAmount ?? existing.discountAmount,
      gstAmount: body.gstAmount ?? existing.gstAmount,
      grandTotal: body.grandTotal ?? existing.grandTotal,
      remarks: body.remarks ?? existing.remarks,
      createdBy: body.createdBy ?? existing.createdBy,
      approvedBy: body.approvedBy ?? existing.approvedBy,
      approvedAt: body.approvedAt ?? existing.approvedAt,
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
