const BomModel = require('../models/bom.model');
const RawSkuModel = require('../models/rawSku.model');

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
    const bomCode = await BomModel.getNextBomCode();
    res.json({ status: true, message: 'Next BOM code fetched successfully', data: { bomCode } });
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

    const bomCode = await BomModel.getNextBomCode();
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

// Moves a BOM from Process to Dispatch, deducting each component's scaled quantity
// (requiredQty * outputQty) from the matching Raw SKU's currentStock.
async function dispatchBom(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status === 'Dispatch') {
      return res.status(400).json({ status: false, message: 'BOM is already dispatched', data: null });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, -needed);
    }

    const updated = await BomModel.update(id, { ...existing, status: 'Dispatch' });
    res.json({ status: true, message: 'BOM dispatched successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

// Reverses dispatchBom: moves Dispatch back to Process and adds the same scaled
// quantities back onto each Raw SKU's currentStock.
async function revertBomToProcess(req, res) {
  try {
    const { id } = req.params;
    const existing = await BomModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status !== 'Dispatch') {
      return res.status(400).json({ status: false, message: 'BOM is not dispatched', data: null });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed);
    }

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

    // The frontend hides the Delete action while a BOM is Dispatch (forcing Revert first),
    // but this stays as a server-side safety net - restore the deducted stock before
    // removing the record so a Dispatch-status BOM can never be deleted without its raw
    // material impact being undone first.
    if (existing.status === 'Dispatch') {
      for (const item of existing.items) {
        const needed = qtyNeeded(item.requiredQty, existing.outputQty);
        await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed);
      }
    }

    await BomModel.remove(id);
    res.json({ status: true, message: 'BOM deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getBoms, getNextBomCode, createBom, updateBom, dispatchBom, revertBomToProcess, deleteBom };
