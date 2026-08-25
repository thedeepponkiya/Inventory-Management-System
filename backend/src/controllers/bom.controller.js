const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const BomModel = require('../models/bom.model');
const RawSkuModel = require('../models/rawSku.model');
const InventoryModel = require('../models/inventory.model');
const CustomFieldService = require('../services/customField.service');

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
    sendServerError(res, err);
  }
}

async function getNextBomCode(req, res) {
  try {
    const bomCode = await BomModel.generateOrderCode();
    res.json({ status: true, message: 'Order code generated successfully', data: { bomCode } });
  } catch (err) {
    sendServerError(res, err);
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
    // Best-effort - a BOM's custom field values are supplementary, so a bad customFields
    // payload still leaves the BOM itself created rather than rejecting the whole request.
    await CustomFieldService.saveValues('bom', created.id, req.body.customFields);
    const withCustomFields = await BomModel.findById(created.id);
    res.status(201).json({ status: true, message: 'BOM created successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
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
    // Status can only change via the dedicated Complete/Revert endpoints (completeBom /
    // revertBomToProcess), which also handle the real stock movement - a plain update that
    // flips status directly would desync it from Inventory/Raw SKU stock, since nothing here
    // touches stock. This was previously exploitable: complete (deducts raw stock, credits
    // finished goods) -> plain update flipping status back to "Process" (no stock reversal)
    // -> complete again, fabricating finished-goods stock indefinitely.
    if (body.status && body.status !== existing.status) {
      return res.status(400).json({ status: false, message: "Use the Complete/Revert actions to change a BOM's status, not a direct update", data: null });
    }
    // Once Completed, outputQty/items/productSku are the historical record of exactly what
    // was produced and consumed - editing them after the fact would corrupt any future revert
    // (revertBomToProcess recomputes quantities from these same fields), same reasoning as
    // Purchase/Sales Order locking their items once no longer Draft.
    if (existing.status === 'Completed' && (body.outputQty !== undefined || body.items !== undefined || body.productSku !== undefined)) {
      return res.status(400).json({ status: false, message: 'Output quantity, components, and product cannot be edited once a BOM is Completed - revert to Process first', data: null });
    }

    const fields = {
      productSku: body.productSku ?? existing.productSku,
      productName: body.productName ?? existing.productName,
      categoryName: body.categoryName ?? existing.categoryName,
      version: body.version ?? existing.version,
      outputQty: body.outputQty ?? existing.outputQty,
      unit: body.unit ?? existing.unit,
      status: existing.status,
      items: body.items ?? existing.items,
      createdBy: body.createdBy ?? existing.createdBy,
      reversedQty: existing.reversedQty,
    };

    await BomModel.update(id, fields);
    await CustomFieldService.saveValues('bom', id, body.customFields);
    const withCustomFields = await BomModel.findById(id);
    res.json({ status: true, message: 'BOM updated successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
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

    const updated = await BomModel.update(id, { ...existing, status: 'Completed', reversedQty: 0 }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'BOM marked as Completed successfully', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Reverses completeBom, partially or fully: restores a caller-supplied `qty` (not always the
// whole run) of the deducted Raw SKU quantities, and removes that same qty from the finished
// good's Inventory. Can be called multiple times on the same Completed BOM - `reversedQty`
// accumulates across calls so a second/third partial reverse can't exceed what was actually
// produced. Once the accumulated total reaches outputQty, the BOM flips back to Process (fully
// undone) and reversedQty resets to 0, exactly like the old always-full revert used to behave.
// Same transaction + locking treatment as completeBom, plus the mirror-image stock check: if
// some of the finished-good quantity this order added has already been sold/dispatched
// elsewhere, removing qty here would push Inventory negative - so that's checked and rejected
// too, not just the raw-material side.
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

    const outputQty = Number(existing.outputQty);
    const alreadyReversed = Number(existing.reversedQty ?? 0);
    const remaining = outputQty - alreadyReversed;
    const qty = Number(req.body.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'Enter a valid quantity to reverse', data: null });
    }
    if (qty > remaining) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Cannot reverse ${qty} - only ${remaining} of this order's ${outputQty} ${existing.unit} remain un-reversed`,
        data: null,
      });
    }

    const inventoryItem = await InventoryModel.findBySkuIdForUpdate(existing.productSku, client);
    const availableQty = Number(inventoryItem?.quantity ?? 0);
    if (availableQty < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Cannot reverse - only ${availableQty} of this finished good remain in Inventory (some may have already been sold/dispatched), but reversing would remove ${qty}`,
        data: null,
      });
    }

    for (const item of existing.items) {
      const needed = qtyNeeded(item.requiredQty, qty);
      await RawSkuModel.adjustStockBySkuCode(item.rawSkuCode, needed, client);
    }
    await InventoryModel.adjustStockBySkuId(existing.productSku, -qty, client);

    const newReversedQty = alreadyReversed + qty;
    const fullyReversed = newReversedQty >= outputQty;
    const updated = await BomModel.update(
      id,
      { ...existing, status: fullyReversed ? 'Process' : 'Completed', reversedQty: fullyReversed ? 0 : newReversedQty },
      client
    );
    await client.query('COMMIT');
    res.json({
      status: true,
      message: fullyReversed ? 'BOM fully reverted to Process successfully' : `Reversed ${qty} ${existing.unit} - ${outputQty - newReversedQty} remaining`,
      data: updated,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Deletable regardless of status, including Completed - deliberately does NOT reverse the
// stock impact a Completed BOM already made (raw materials stay deducted, finished goods stay
// credited exactly as they are). If that stock movement itself needs undoing, revert to
// Process first (revertBomToProcess) before deleting; deleting a Completed BOM directly is
// purely a record-cleanup action. Still runs inside a transaction with a row lock (not just a
// plain findById) so a delete can't race a concurrent completeBom transitioning this same row
// from Process to Completed.
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

    await BomModel.remove(id, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'BOM deleted successfully', data: null });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { getBoms, getNextBomCode, createBom, updateBom, revertBomToProcess, completeBom, deleteBom };
