const pool = require('../config/db');
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
      // Derived from the authenticated session, not trusted from the request body - see
      // purchaseOrder.controller.js's identical fix for why.
      createdBy: req.user.userName,
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
//
// Runs inside a single transaction with row-level locks (SELECT ... FOR UPDATE) on the BOM
// itself and every raw material it touches: without this, two concurrent "Complete" requests
// on two different orders sharing a raw material could both read the same starting stock,
// both pass a sufficiency check, and both deduct - pushing currentStock negative. Every raw
// material's live (locked) stock is checked against what's needed BEFORE anything is
// deducted, and the whole operation is rejected (rolled back, nothing changes) if even one
// line is short - matching the same all-or-nothing validate-then-mutate pattern already used
// by salesOrder.controller.js's dispatchSalesOrder.
async function completeBom(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await BomModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status !== 'Process') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Only a BOM in Process can be marked Completed', data: null });
    }

    const inventoryItem = await InventoryModel.findBySkuIdForUpdate(existing.productSku, client);
    if (!inventoryItem) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `No Inventory item found for product SKU "${existing.productSku}" - create it in Inventory Home first`,
        data: null,
      });
    }

    const shortages = [];
    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      const rawSku = await RawSkuModel.findByCodeForUpdate(item.rawSkuCode, client);
      const available = Number(rawSku?.currentStock ?? 0);
      if (available < needed) {
        shortages.push(`${item.rawSkuName || item.rawSkuCode}: need ${needed}, only ${available} in stock`);
      }
    }
    if (shortages.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Not enough raw material stock to complete this order - ${shortages.join('; ')}`,
        data: null,
      });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, -needed, client);
    }
    await InventoryModel.adjustStockBySkuId(existing.productSku, existing.outputQty, client);

    const updated = await BomModel.update(id, { ...existing, status: 'Completed' }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'BOM marked as Completed successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: false, message: err.message, data: null });
  } finally {
    client.release();
  }
}

// Reverses completeBom: moves Completed back to Process, restoring the deducted Raw SKU
// quantities and removing the outputQty that was added to the finished good's Inventory.
// Same transaction + locking treatment as completeBom, plus the mirror-image stock check:
// if some of the finished-good quantity this order added has already been sold/dispatched
// elsewhere, removing outputQty here would push Inventory negative - so that's checked and
// rejected too, not just the raw-material side.
async function revertBomToProcess(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await BomModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }
    if (existing.status !== 'Completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'BOM is not completed', data: null });
    }

    const inventoryItem = await InventoryModel.findBySkuIdForUpdate(existing.productSku, client);
    const availableQty = Number(inventoryItem?.quantity ?? 0);
    if (availableQty < existing.outputQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Cannot revert - only ${availableQty} of this finished good remain in Inventory (some may have already been sold/dispatched), but reverting would remove ${existing.outputQty}`,
        data: null,
      });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, existing.outputQty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed, client);
    }
    await InventoryModel.adjustStockBySkuId(existing.productSku, -existing.outputQty, client);

    const updated = await BomModel.update(id, { ...existing, status: 'Process' }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'BOM reverted to Process successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: false, message: err.message, data: null });
  } finally {
    client.release();
  }
}

// Completed BOMs are a permanent production record now - never deletable, regardless of
// whether reversing their stock impact would still be safe. Revert to Process first (which
// itself is blocked once the output has been sold/dispatched - see revertBomToProcess) if a
// Completed BOM genuinely needs to be undone. Still runs inside a transaction with a row lock
// (not just a plain findById) so a delete can't race a concurrent completeBom transitioning
// this same row from Process to Completed.
async function deleteBom(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await BomModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }

    if (existing.status === 'Completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: 'Completed BOMs cannot be deleted - revert to Process first if you need to undo it.',
        data: null,
      });
    }

    await BomModel.remove(id, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'BOM deleted successfully', data: null });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: false, message: err.message, data: null });
  } finally {
    client.release();
  }
}

module.exports = { getBoms, getNextBomCode, createBom, updateBom, revertBomToProcess, completeBom, deleteBom };
