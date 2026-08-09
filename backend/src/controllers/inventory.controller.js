const InventoryModel = require('../models/inventory.model');

async function getInventories(req, res) {
  try {
    const inventories = await InventoryModel.getAll();
    res.json({ status: true, message: 'Inventory items fetched successfully', data: inventories });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function getNextSkuId(req, res) {
  try {
    const skuId = await InventoryModel.getNextSkuId();
    res.json({ status: true, message: 'Next SKU ID fetched successfully', data: { skuId } });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createInventory(req, res) {
  try {
    const { productName } = req.body;
    if (!productName) {
      return res.status(400).json({ status: false, message: 'productName is required', data: null });
    }

    const skuId = await InventoryModel.getNextSkuId();
    const fields = {
      images: req.body.images || [],
      productName,
      categoryName: req.body.categoryName || null,
      productType: req.body.productType || null,
      barcode: req.body.barcode || null,
      quantity: req.body.quantity || 0,
      unit: req.body.unit || 'PCS',
      locationName: req.body.locationName || null,
      status: req.body.status || 'Active',
      unitCost: req.body.unitCost || 0,
      sellingCost: req.body.sellingCost || 0,
      createdDate: req.body.createdDate || new Date().toISOString().slice(0, 10),
      assembly: req.body.assembly || [],
      minStock: req.body.minStock || 0,
      maxStock: req.body.maxStock || 0,
      openingStock: req.body.openingStock || 0,
    };

    const created = await InventoryModel.create(skuId, fields);
    res.status(201).json({ status: true, message: 'Inventory item created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateInventory(req, res) {
  try {
    const { id } = req.params;
    const existing = await InventoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Inventory item not found', data: null });
    }

    const body = req.body;
    const fields = {
      images: body.images ?? existing.images,
      productName: body.productName ?? existing.productName,
      categoryName: body.categoryName ?? existing.categoryName,
      productType: body.productType ?? existing.productType,
      barcode: body.barcode ?? existing.barcode,
      quantity: body.quantity ?? existing.quantity,
      unit: body.unit ?? existing.unit,
      locationName: body.locationName ?? existing.locationName,
      status: body.status ?? existing.status,
      unitCost: body.unitCost ?? existing.unitCost,
      sellingCost: body.sellingCost ?? existing.sellingCost,
      assembly: body.assembly ?? existing.assembly,
      minStock: body.minStock ?? existing.minStock,
      maxStock: body.maxStock ?? existing.maxStock,
      openingStock: body.openingStock ?? existing.openingStock,
    };

    const updated = await InventoryModel.update(id, fields);
    res.json({ status: true, message: 'Inventory item updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteInventory(req, res) {
  try {
    const { id } = req.params;
    const existing = await InventoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Inventory item not found', data: null });
    }

    await InventoryModel.remove(id);
    res.json({ status: true, message: 'Inventory item deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getInventories, getNextSkuId, createInventory, updateInventory, deleteInventory };
