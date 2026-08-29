const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const BomModel = require('../models/bom.model');
const InventoryModel = require('../models/inventory.model');
const RawSkuModel = require('../models/rawSku.model');
const CustomFieldService = require('../services/customField.service');

// A BOM's own "status" is never set directly by the client - it's always derived from its
// items' own per-line status, recomputed here every time items change (create/update) or a
// single line is completed/reverted. Process (nothing completed yet) -> Partially Completed
// (some lines done, some not) -> Completed (every line done) - matches how the frontend's
// expandable BOM row shows each line's own Complete/Revert action independently.
function computeBomStatus(items) {
  if (!items || items.length === 0) return 'Process';
  const completedCount = items.filter((item) => item.status === 'Completed').length;
  if (completedCount === 0) return 'Process';
  if (completedCount === items.length) return 'Completed';
  return 'Partially Completed';
}

// Never trusts a client-supplied 'Completed' on create/update at face value - that would let
// someone fabricate a completed line (and its stock effects) without ever going through
// completeBomItem. A line is only allowed to come through as 'Completed' here if it already
// genuinely was one (same skuId, same requiredQty, found in `existingItemsBySkuId` - the
// caller's own current items before this update) - otherwise it's forced back to 'Pending'.
// This preserves already-Completed lines across an update that only touches other, still-
// Pending lines (e.g. adding one more item) while still blocking a client from smuggling a
// brand new line in as already Completed. createBom passes no existing items, so every line
// on a fresh BOM always starts 'Pending' regardless of what the client sent.
function normalizeItems(items, existingItemsBySkuId = new Map()) {
  return (items || []).map((item) => {
    const existing = existingItemsBySkuId.get(item.skuId);
    const wasCompleted = existing && existing.status === 'Completed' && Number(existing.requiredQty) === Number(item.requiredQty);
    return { ...item, status: wasCompleted ? 'Completed' : 'Pending' };
  });
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
    // The frontend previews a code (via getNextBomCode) when the Add BOM dialog opens so the
    // user sees the code before saving - reused here as-is if still unclaimed, so the
    // previewed code and the one actually saved always match. Falls back to generating a
    // fresh one if it's missing or got claimed by another order in the meantime.
    let bomCode = req.body.bomCode;
    if (!bomCode || (await BomModel.findByCode(bomCode))) {
      bomCode = await BomModel.generateOrderCode();
    }
    const items = normalizeItems(req.body.items);
    const fields = {
      // Left null - a BOM no longer has one shared output product (see schema.sql's
      // migration comment above ims_bom's CREATE TABLE).
      productSku: null,
      productName: null,
      categoryName: null,
      version: req.body.version || '1.0',
      outputQty: null,
      unit: null,
      status: computeBomStatus(items),
      items,
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

    // Once ANY item has been Completed, the whole BOM locks - not just that one line (see the
    // stillIntact check further down, which only protects a Completed line's own qty/status).
    // Production against this BOM has already started, so adding a new item, editing/removing
    // a still-Pending one, or renaming the BOM Code are all blocked outright too - the only way
    // back to an editable state is reverting every Completed item to Pending first (via
    // revertBomItem, a separate endpoint this guard doesn't touch).
    if (existing.status !== 'Process') {
      return res.status(400).json({ status: false, message: 'This BOM has items already Completed and can no longer be edited - revert every item back to Pending first', data: null });
    }

    const body = req.body;
    const existingItemsBySkuId = new Map((existing.items || []).map((item) => [item.skuId, item]));
    // The guard above already means every item here is Pending - a BOM's status can only be
    // 'Process' (the one status this function still reaches past the guard for) when it has no
    // Completed item at all, so there's no longer a per-line "was this Completed line touched"
    // check needed on top of it; the whole-BOM lock above supersedes it.
    const newItems = body.items ? normalizeItems(body.items, existingItemsBySkuId) : existing.items;

    // bomCode is user-editable now (not just previewed once at create) - re-check uniqueness
    // on an actual rename the same way createBom does for a fresh one, since the column still
    // carries a UNIQUE constraint. Trimmed and compared case-sensitively, matching how it's
    // typed/displayed everywhere else.
    let bomCode;
    if (body.bomCode !== undefined && body.bomCode !== existing.bomCode) {
      bomCode = String(body.bomCode).trim();
      if (!bomCode) {
        return res.status(400).json({ status: false, message: 'BOM Code cannot be empty', data: null });
      }
      const clash = await BomModel.findByCode(bomCode);
      if (clash && clash.id !== existing.id) {
        return res.status(400).json({ status: false, message: `BOM Code "${bomCode}" is already in use`, data: null });
      }
    }

    const fields = {
      bomCode,
      productSku: null,
      productName: null,
      categoryName: null,
      version: body.version ?? existing.version,
      outputQty: null,
      unit: null,
      status: computeBomStatus(newItems),
      items: newItems,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    await BomModel.update(id, fields);
    await CustomFieldService.saveValues('bom', id, body.customFields);
    const withCustomFields = await BomModel.findById(id);
    res.json({ status: true, message: 'BOM updated successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

// Marks ONE line of a BOM as Completed - this is where production actually happens for that
// line: its own Finished SKU assembly (ims_inventories.assembly, scaled by that line's own
// requiredQty) is deducted from ims_raw_sku."currentStock", and requiredQty is credited onto
// that same Inventory item's own quantity. The BOM's overall "status" is then recomputed from
// every line's status (see computeBomStatus) - Completed only once every line is done.
//
// Runs inside a single transaction with row-level locks (SELECT ... FOR UPDATE) on the BOM
// and every Finished SKU it touches, same all-or-nothing validate-then-mutate pattern as
// salesOrder.controller.js's dispatchSalesOrder / the old completeBom.
async function completeBomItem(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id, skuId } = req.params;
    const existing = await BomModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }

    const itemIndex = existing.items.findIndex((item) => item.skuId === skuId);
    if (itemIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'This item is not part of this BOM', data: null });
    }
    const item = existing.items[itemIndex];
    if (item.status === 'Completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'This item is already Completed', data: null });
    }

    const inventoryItem = await InventoryModel.findBySkuIdForUpdate(skuId, client);
    if (!inventoryItem) {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: `No Inventory item found for SKU "${skuId}"`, data: null });
    }

    const assembly = inventoryItem.assembly || [];
    const requiredQty = Number(item.requiredQty);

    // Sum each Finished SKU's total need across every assembly line referencing it BEFORE
    // checking/deducting stock. Nothing dedupes/merges assembly rows when they're edited in
    // Inventory Home's Product Assembly tab, so the same Finished SKU can legitimately (or
    // accidentally) appear on more than one line - checking/deducting line-by-line instead
    // would check each line's need against the SAME starting stock independently, letting a
    // combined shortage slip through the check and then pushing that Finished SKU's stock
    // negative once both lines are deducted.
    const neededBySkuCode = new Map();
    for (const line of assembly) {
      const needed = Number(line.quantity) * requiredQty;
      neededBySkuCode.set(line.skuCode, (neededBySkuCode.get(line.skuCode) || 0) + needed);
    }

    const shortages = [];
    for (const [skuCode, needed] of neededBySkuCode) {
      const rawSku = await RawSkuModel.findByCodeForUpdate(skuCode, client);
      const available = Number(rawSku?.currentStock ?? 0);
      if (available < needed) {
        shortages.push(`${rawSku?.skuName || skuCode}: need ${needed}, only ${available} in stock`);
      }
    }
    if (shortages.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Not enough Finished SKU stock to complete "${item.productName}" - ${shortages.join('; ')}`,
        data: null,
      });
    }

    for (const [skuCode, needed] of neededBySkuCode) {
      await RawSkuModel.adjustStockBySkuCode(skuCode, -needed, client);
    }
    await InventoryModel.adjustStockBySkuId(skuId, requiredQty, client);

    const updatedItems = existing.items.map((it, idx) => (idx === itemIndex ? { ...it, status: 'Completed' } : it));
    const updated = await BomModel.update(id, { ...existing, items: updatedItems, status: computeBomStatus(updatedItems) }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'Item marked as Completed', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Reverses completeBomItem for one line: restores its Finished SKU assembly quantities and
// removes requiredQty back off that Inventory item's own quantity, then flips that line back
// to Pending. Mirror-image stock check to completeBomItem's shortage check - if some of the
// Inventory quantity this line credited has already been sold/dispatched elsewhere, removing
// it here would push that Inventory item's stock negative, so that's checked and rejected too.
async function revertBomItem(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id, skuId } = req.params;
    const existing = await BomModel.findByIdForUpdate(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'BOM not found', data: null });
    }

    const itemIndex = existing.items.findIndex((item) => item.skuId === skuId);
    if (itemIndex === -1) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'This item is not part of this BOM', data: null });
    }
    const item = existing.items[itemIndex];
    if (item.status !== 'Completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: false, message: 'This item is not Completed', data: null });
    }

    const inventoryItem = await InventoryModel.findBySkuIdForUpdate(skuId, client);
    const requiredQty = Number(item.requiredQty);
    const availableQty = Number(inventoryItem?.quantity ?? 0);
    if (availableQty < requiredQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: false,
        message: `Cannot revert "${item.productName}" - only ${availableQty} remain in Inventory (some may have already been sold/dispatched), but reverting would remove ${requiredQty}`,
        data: null,
      });
    }

    // Summed per Finished SKU first, same reasoning as completeBomItem's identical step -
    // the same Finished SKU can appear on more than one assembly line, so this restores the
    // combined amount in one adjustStockBySkuCode call per SKU rather than one per line.
    const assembly = inventoryItem?.assembly || [];
    const restoredBySkuCode = new Map();
    for (const line of assembly) {
      const restored = Number(line.quantity) * requiredQty;
      restoredBySkuCode.set(line.skuCode, (restoredBySkuCode.get(line.skuCode) || 0) + restored);
    }
    for (const [skuCode, restored] of restoredBySkuCode) {
      await RawSkuModel.adjustStockBySkuCode(skuCode, restored, client);
    }
    await InventoryModel.adjustStockBySkuId(skuId, -requiredQty, client);

    const updatedItems = existing.items.map((it, idx) => (idx === itemIndex ? { ...it, status: 'Pending' } : it));
    const updated = await BomModel.update(id, { ...existing, items: updatedItems, status: computeBomStatus(updatedItems) }, client);
    await client.query('COMMIT');
    res.json({ status: true, message: 'Item reverted to Pending', data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

// Deletable regardless of status, including Completed/Partially Completed - deliberately does
// NOT reverse the stock impact any already-Completed line made (that Inventory item stays
// credited, its Finished SKU stays deducted). If that stock movement itself needs undoing,
// revert the individual line(s) first (revertBomItem) before deleting; deleting directly is
// purely a record-cleanup action. Still runs inside a transaction with a row lock (not just a
// plain findById) so a delete can't race a concurrent completeBomItem/revertBomItem.
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

module.exports = { getBoms, getNextBomCode, createBom, updateBom, completeBomItem, revertBomItem, deleteBom };
