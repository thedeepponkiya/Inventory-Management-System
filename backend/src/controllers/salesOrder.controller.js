const SalesOrderModel = require('../models/salesOrder.model');
const InventoryModel = require('../models/inventory.model');

async function getSalesOrders(req, res) {
  try {
    const salesOrders = await SalesOrderModel.getAll();
    res.json({ status: true, message: 'Sales orders fetched successfully', data: salesOrders });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createSalesOrder(req, res) {
  try {
    const { customerName, orderDate } = req.body;
    if (!customerName || !orderDate) {
      return res.status(400).json({ status: false, message: 'customerName and orderDate are required', data: null });
    }

    const soNo = await SalesOrderModel.getNextSoNo();
    // Every line starts fully pending - dispatchedQty only grows via the /dispatch action.
    const items = (req.body.items || []).map((item) => ({
      ...item,
      dispatchedQty: 0,
      pendingQty: item.orderedQty,
    }));
    const fields = {
      customerName,
      customerCode: req.body.customerCode || null,
      orderDate,
      deliveryDate: req.body.deliveryDate || null,
      deliveryAddress: req.body.deliveryAddress || null,
      status: 'Draft',
      paymentStatus: req.body.paymentStatus || 'Unpaid',
      paidAmount: req.body.paidAmount || 0,
      paymentTerms: req.body.paymentTerms || null,
      purchaseOrderRef: req.body.purchaseOrderRef || null,
      currency: req.body.currency || 'INR - Indian Rupee',
      items,
      totalItems: req.body.totalItems || 0,
      totalQty: req.body.totalQty || 0,
      subTotal: req.body.subTotal || 0,
      discountAmount: req.body.discountAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      grandTotal: req.body.grandTotal || 0,
      remarks: req.body.remarks || null,
      createdBy: req.body.createdBy || 'Admin User',
    };

    const created = await SalesOrderModel.create(soNo, fields);
    res.status(201).json({ status: true, message: 'Sales order created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
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

    const body = req.body;
    const items = body.items
      ? body.items.map((item) => ({ ...item, dispatchedQty: 0, pendingQty: item.orderedQty }))
      : existing.items;
    const fields = {
      customerName: body.customerName ?? existing.customerName,
      customerCode: body.customerCode ?? existing.customerCode,
      orderDate: body.orderDate ?? existing.orderDate,
      deliveryDate: body.deliveryDate ?? existing.deliveryDate,
      deliveryAddress: body.deliveryAddress ?? existing.deliveryAddress,
      status: existing.status,
      paymentStatus: body.paymentStatus ?? existing.paymentStatus,
      paidAmount: body.paidAmount ?? existing.paidAmount,
      paymentTerms: body.paymentTerms ?? existing.paymentTerms,
      purchaseOrderRef: body.purchaseOrderRef ?? existing.purchaseOrderRef,
      currency: body.currency ?? existing.currency,
      items,
      totalItems: body.totalItems ?? existing.totalItems,
      totalQty: body.totalQty ?? existing.totalQty,
      subTotal: body.subTotal ?? existing.subTotal,
      discountAmount: body.discountAmount ?? existing.discountAmount,
      gstAmount: body.gstAmount ?? existing.gstAmount,
      grandTotal: body.grandTotal ?? existing.grandTotal,
      remarks: body.remarks ?? existing.remarks,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await SalesOrderModel.update(id, fields);
    res.json({ status: true, message: 'Sales order updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

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

    const updated = await SalesOrderModel.update(id, { ...existing, status: 'Confirmed' });
    res.json({ status: true, message: 'Sales order confirmed successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
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
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

// Ships some or all of the still-pending quantity for one or more lines - deducts that
// exact quantity from each line's Inventory SKU (mirrors BOM's Dispatch step, but per-item
// and allowed to happen incrementally across multiple calls instead of one all-or-nothing
// shot). Status becomes "Dispatched" once every line's pendingQty reaches 0, otherwise
// "Partially Shipped".
async function dispatchSalesOrder(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Processing' && existing.status !== 'Partially Shipped') {
      return res.status(400).json({ status: false, message: 'Only a Processing or Partially Shipped order can be dispatched', data: null });
    }

    const shipments = req.body.items;
    if (!Array.isArray(shipments) || shipments.length === 0) {
      return res.status(400).json({ status: false, message: 'Provide at least one item to ship', data: null });
    }
    const shipMap = new Map(shipments.map((s) => [s.skuId, Number(s.shipQty) || 0]));

    // Validate everything before touching any stock, so a failure partway through never
    // leaves some lines shipped and others rejected.
    for (const item of existing.items) {
      const shipQty = shipMap.get(item.skuId) || 0;
      if (shipQty <= 0) continue;
      if (shipQty > Number(item.pendingQty)) {
        return res.status(400).json({ status: false, message: `Cannot ship more than the pending quantity for ${item.itemName}`, data: null });
      }
      const inventoryItem = await InventoryModel.findBySkuId(item.skuId);
      if (!inventoryItem || Number(inventoryItem.quantity) < shipQty) {
        return res.status(400).json({ status: false, message: `Not enough stock in Inventory to ship ${item.itemName}`, data: null });
      }
    }

    const updatedItems = [];
    for (const item of existing.items) {
      const shipQty = shipMap.get(item.skuId) || 0;
      if (shipQty > 0) {
        await InventoryModel.adjustStockBySkuId(item.skuId, -shipQty);
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
    });
    res.json({ status: true, message: 'Items dispatched successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

// Undoes every shipment made so far on this order in one shot - restores each line's
// dispatchedQty back to Inventory and resets it to fully pending. Does not support
// reverting a single partial shipment out of several; only a full reset back to Processing.
async function revertDispatch(req, res) {
  try {
    const { id } = req.params;
    const existing = await SalesOrderModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Sales order not found', data: null });
    }
    if (existing.status !== 'Partially Shipped' && existing.status !== 'Dispatched') {
      return res.status(400).json({ status: false, message: 'Only a Partially Shipped or Dispatched order can be reverted', data: null });
    }

    const updatedItems = [];
    for (const item of existing.items) {
      const dispatchedQty = Number(item.dispatchedQty);
      if (dispatchedQty > 0) {
        await InventoryModel.adjustStockBySkuId(item.skuId, dispatchedQty);
      }
      updatedItems.push({ ...item, dispatchedQty: 0, pendingQty: item.orderedQty });
    }

    const updated = await SalesOrderModel.update(id, { ...existing, items: updatedItems, status: 'Processing' });
    res.json({ status: true, message: 'Sales order reverted to Processing successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
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
    res.status(500).json({ status: false, message: err.message, data: null });
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
    res.status(500).json({ status: false, message: err.message, data: null });
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
