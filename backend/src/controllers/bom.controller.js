const BomModel = require('../models/bom.model');
const RawSkuModel = require('../models/rawSku.model');
const InventoryModel = require('../models/inventory.model');

// Total needed for a production run of outputQty units - same formula as the frontend's
// live "Qty Needed" preview (CommonUtilities.tsx / bomPdf.ts).
function qtyNeeded(requiredQty, outputQty) {
  return requiredQty * outputQty;
}

async function getBoms(req, res) {
  try {
    const boms = await BomModel.getAll();
    res.json({ status: true, message: 'BOMs fetched successfully', data: boms });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function getNextBomCode(req, res) {
  try {
    const bomCode = await BomModel.generateOrderCode();
    res.json({ status: true, message: 'Order code generated successfully', data: { bomCode } });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createBom(req, res) {
  try {
    const { productSku, productName } = req.body;
    if (!productSku || !productName) {
      return res.status(400).json({ status: false, message: 'productSku and productName are required', data: null });
    }

    // The frontend previews a code (via getNextBomCode) when the Add Order dialog opens so
    // the user sees the code before saving - reused here as-is if still unclaimed, so the
    // previewed code and the one actually saved always match. Falls back to generating a
    // fresh one if it's missing or got claimed by another order in the meantime.
    let bomCode = req.body.bomCode;
    if (!bomCode || (await BomModel.findByCode(bomCode))) {
      bomCode = await BomModel.generateOrderCode();
    }
    const fields = {
      productSku,
      productName,
      categoryName: req.body.categoryName || null,
      version: req.body.version || '1.0',
      outputQty: req.body.outputQty || 1,
      unit: req.body.unit || 'PCS',
      status: req.body.status || 'Process',
      items: req.body.items || [],
      createdBy: req.body.createdBy || 'Admin User',
    };

    const created = await BomModel.create(bomCode, fields);
    res.status(201).json({ status: true, message: 'BOM created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateBom(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }

    const body = req.body;
    const fields = {
      productSku: body.productSku ?? existing.productSku,
      productName: body.productName ?? existing.productName,
      categoryName: body.categoryName ?? existing.categoryName,
      version: body.version ?? existing.version,
      outputQty: body.outputQty ?? existing.outputQty,
      unit: body.unit ?? existing.unit,
      status: body.status ?? existing.status,
      items: body.items ?? existing.items,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await BomModel.update(id, fields);
    res.json({ status: true, message: 'BOM updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

// Moves a BOM from Process to Completed: production actually happens here - each
// component's scaled quantity (requiredQty * outputQty) is deducted from the matching Raw
// SKU's currentStock, and outputQty is added onto the matching Inventory item's quantity
// (matched by productSku === ims_inventories.skuId).
async function completeBom(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status !== 'Process') {
      return res.status(400).json({ status: false, message: 'Only a BOM in Process can be marked Completed', data: null });
    }

    const inventoryItem = await InventoryModel.findBySkuId(existing.productSku);
    if (!inventoryItem) {
      return res.status(400).json({
        status: false,
        message: `No Inventory item found for product SKU "${existing.productSku}" - create it in Inventory Home first`,
        data: null,
      });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, -needed);
    }
    await InventoryModel.adjustStockBySkuId(existing.productSku, existing.outputQty);

    const updated = await BomModel.update(id, { ...existing, status: 'Completed' });
    res.json({ status: true, message: 'BOM marked as Completed successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

// Reverses completeBom: moves Completed back to Process, restoring the deducted Raw SKU
// quantities and removing the outputQty that was added to the finished good's Inventory.
async function revertBomToProcess(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status !== 'Completed') {
      return res.status(400).json({ status: false, message: 'BOM is not completed', data: null });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed);
    }
    await InventoryModel.adjustStockBySkuId(existing.productSku, -existing.outputQty);

    const updated = await BomModel.update(id, { ...existing, status: 'Process' });
    res.json({ status: true, message: 'BOM reverted to Process successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteBom(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }

    // The frontend hides the Delete action while a BOM is Completed (forcing Revert to
    // Process first), but this stays as a server-side safety net - restore every
    // outstanding stock impact before removing the record.
    if (existing.status === 'Completed') {
      for (const item of existing.items) {
        const needed = qtyNeeded(item.requiredQty, existing.outputQty);
        await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed);
      }
      await InventoryModel.adjustStockBySkuId(existing.productSku, -existing.outputQty);
    }

    await BomModel.remove(id);
    res.json({ status: true, message: 'BOM deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getBoms, getNextBomCode, createBom, updateBom, revertBomToProcess, completeBom, deleteBom };
