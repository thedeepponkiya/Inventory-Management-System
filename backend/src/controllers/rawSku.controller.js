const RawSkuModel = require('../models/rawSku.model');

async function getRawSkus(req, res) {
  try {
    const rawSkus = await RawSkuModel.getAll();
    res.json({ status: true, message: 'Raw SKUs fetched successfully', data: rawSkus });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createRawSku(req, res) {
  try {
    const { skuName } = req.body;
    if (!skuName) {
      return res.status(400).json({ status: false, message: 'skuName is required', data: null });
    }

    const skuCode = await RawSkuModel.getNextSkuCode();
    const openingStock = req.body.openingStock || 0;
    const fields = {
      skuName,
      categoryId: req.body.categoryId || null,
      unit: req.body.unit || 'PCS',
      inventoryEntryMode: req.body.inventoryEntryMode || 'MANUAL',
      sourceType: req.body.sourceType || 'Direct Purchase',
      rawMaterialId: req.body.rawMaterialId || null,
      minStock: req.body.minStock || 0,
      maxStock: req.body.maxStock || 0,
      reorderLevel: req.body.reorderLevel || 0,
      openingStock,
      // No transactions have happened yet on create, so current starts out equal to opening.
      currentStock: req.body.currentStock ?? openingStock,
      description: req.body.description || null,
      status: req.body.status || 'Active',
      createdBy: req.body.createdBy || 'Admin User',
    };

    const created = await RawSkuModel.create(skuCode, fields);
    res.status(201).json({ status: true, message: 'Raw SKU created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateRawSku(req, res) {
  try {
    const { id } = req.params;
    const existing = await RawSkuModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Raw SKU not found', data: null });
    }

    const body = req.body;
    const fields = {
      skuName: body.skuName ?? existing.skuName,
      categoryId: body.categoryId ?? existing.categoryId,
      unit: body.unit ?? existing.unit,
      inventoryEntryMode: body.inventoryEntryMode ?? existing.inventoryEntryMode,
      sourceType: body.sourceType ?? existing.sourceType,
      rawMaterialId: body.rawMaterialId ?? existing.rawMaterialId,
      minStock: body.minStock ?? existing.minStock,
      maxStock: body.maxStock ?? existing.maxStock,
      reorderLevel: body.reorderLevel ?? existing.reorderLevel,
      openingStock: body.openingStock ?? existing.openingStock,
      currentStock: body.currentStock ?? existing.currentStock,
      description: body.description ?? existing.description,
      status: body.status ?? existing.status,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await RawSkuModel.update(id, fields);
    res.json({ status: true, message: 'Raw SKU updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteRawSku(req, res) {
  try {
    const { id } = req.params;
    const existing = await RawSkuModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Raw SKU not found', data: null });
    }

    await RawSkuModel.remove(id);
    res.json({ status: true, message: 'Raw SKU deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getRawSkus, createRawSku, updateRawSku, deleteRawSku };
