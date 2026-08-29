const { sendServerError } = require('../utils/errorResponse');
const RawSkuModel = require('../models/rawSku.model');
const { deleteAllImages, deleteRemovedImages } = require('../utils/imageCleanup.util');
const { findNegativeField, validateStockRange } = require('../utils/stockValidation.util');
const InventoryModel = require('../models/inventory.model');

// A Raw SKU's skuCode is referenced BY VALUE, not by a real foreign key:
// ims_inventories.assembly[].skuCode is a plain string inside a JSONB array. Nothing in the
// database stops a rename or a delete from orphaning those lines, and the helper that follows
// them (RawSkuModel.adjustStockBySkuCode, used by BOM item completion/revert and Material
// Inward receiving) silently NO-OPS when the code matches no row - so a BOM completion would
// either fail its stock check forever or deduct nothing at all, with no error. Same
// "don't let a delete orphan its dependents" guard purchaseOrder.controller.js's
// deletePurchaseOrder applies against Material Inwards, just over a JSONB array instead of an
// FK column. Returns a human-readable "N Inventory item(s)" phrase, or null when nothing
// references the code.
async function describeRawSkuReferences(skuCode) {
  const inventoryCount = await InventoryModel.countByAssemblySkuCode(skuCode);
  if (inventoryCount === 0) return null;
  return `${inventoryCount} Inventory item${inventoryCount === 1 ? '' : 's'}`;
}

async function getRawSkus(req, res) {
  try {
    const rawSkus = await RawSkuModel.getAll();
    res.json({ status: true, message: 'Raw SKUs fetched successfully', data: rawSkus });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function getNextSkuCode(req, res) {
  try {
    const skuCode = await RawSkuModel.getNextSkuCode();
    res.json({ status: true, message: 'Next SKU code fetched successfully', data: { skuCode } });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createRawSku(req, res) {
  try {
    const { skuName } = req.body;
    if (!skuName) {
      return res.status(400).json({ status: false, message: 'skuName is required', data: null });
    }

    // Honors a user-typed SKU Code (editable at create time) if provided and not already
    // taken - re-checked here rather than trusted from the previewed value shown in the form,
    // since another SKU could have claimed it in the meantime. Falls back to auto-generating
    // one, same as before, when the field was left blank.
    let skuCode = req.body.skuCode ? String(req.body.skuCode).trim() : '';
    if (skuCode) {
      if (await RawSkuModel.findByCode(skuCode)) {
        return res.status(400).json({ status: false, message: `SKU Code "${skuCode}" is already in use - choose a different one`, data: null });
      }
    } else {
      skuCode = await RawSkuModel.getNextSkuCode();
    }
    const openingStock = req.body.openingStock || 0;
    const fields = {
      skuName,
      categoryId: req.body.categoryId || null,
      productTypeId: req.body.productTypeId || null,
      locationId: req.body.locationId || null,
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
      // Derived from the authenticated session, not trusted from the request body - see
      // purchaseOrder.controller.js's identical fix for why.
      createdBy: req.user.userName,
      images: req.body.images || [],
      material: req.body.material || null,
    };

    // Frontend-only guarded before now - see stockValidation.util.js for why each matters.
    const negativeField = findNegativeField({
      minStock: fields.minStock, maxStock: fields.maxStock, reorderLevel: fields.reorderLevel,
      openingStock: fields.openingStock, currentStock: fields.currentStock,
    });
    if (negativeField) {
      return res.status(400).json({ status: false, message: `${negativeField} cannot be negative`, data: null });
    }
    const rangeError = validateStockRange(fields.minStock, fields.maxStock);
    if (rangeError) {
      return res.status(400).json({ status: false, message: rangeError, data: null });
    }

    const created = await RawSkuModel.create(skuCode, fields);
    res.status(201).json({ status: true, message: 'Raw SKU created successfully', data: created });
  } catch (err) {
    sendServerError(res, err);
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

    // SKU Code is now editable after creation too (the field is unlocked in the Edit dialog) -
    // re-checked against other rows here the same way createRawSku checks a user-typed
    // skuCode, just excluding this row's own current value from the conflict check.
    if (body.skuCode !== undefined && body.skuCode !== existing.skuCode) {
      const skuCode = String(body.skuCode).trim();
      if (!skuCode) {
        return res.status(400).json({ status: false, message: 'SKU Code cannot be empty', data: null });
      }
      const conflict = await RawSkuModel.findByCode(skuCode);
      if (conflict && conflict.id !== Number(id)) {
        return res.status(400).json({ status: false, message: `SKU Code "${skuCode}" is already in use - choose a different one`, data: null });
      }
      // Only reached when the code is actually CHANGING (same condition as the uniqueness
      // check above), so a save that doesn't touch the SKU Code costs zero extra queries.
      const references = await describeRawSkuReferences(existing.skuCode);
      if (references) {
        return res.status(400).json({ status: false, message: `Cannot rename this SKU Code - it's referenced by the Product Assembly of ${references}. Remove those references first.`, data: null });
      }
      body.skuCode = skuCode;
    }

    const fields = {
      skuCode: body.skuCode ?? existing.skuCode,
      skuName: body.skuName ?? existing.skuName,
      categoryId: body.categoryId ?? existing.categoryId,
      productTypeId: body.productTypeId ?? existing.productTypeId,
      locationId: body.locationId ?? existing.locationId,
      unit: body.unit ?? existing.unit,
      inventoryEntryMode: body.inventoryEntryMode ?? existing.inventoryEntryMode,
      sourceType: body.sourceType ?? existing.sourceType,
      rawMaterialId: body.rawMaterialId ?? existing.rawMaterialId,
      minStock: body.minStock ?? existing.minStock,
      maxStock: body.maxStock ?? existing.maxStock,
      reorderLevel: body.reorderLevel ?? existing.reorderLevel,
      openingStock: body.openingStock ?? existing.openingStock,
      // null (not existing.currentStock) when the client didn't send a value - the model's
      // UPDATE COALESCEs this against the LIVE column value at write time instead of the
      // value read here moments earlier, so an unrelated field edit (e.g. just minStock) run
      // concurrently with a BOM completion/dispatch/material inward touching this same SKU's
      // stock can no longer silently overwrite that other transaction's stock change with a
      // stale snapshot.
      currentStock: body.currentStock ?? null,
      description: body.description ?? existing.description,
      status: body.status ?? existing.status,
      createdBy: body.createdBy ?? existing.createdBy,
      images: body.images ?? existing.images,
      material: body.material ?? existing.material,
    };

    // Same checks as createRawSku - `fields.currentStock` can legitimately be null here (see
    // the comment above it), and findNegativeField already skips null/undefined.
    const negativeField = findNegativeField({
      minStock: fields.minStock, maxStock: fields.maxStock, reorderLevel: fields.reorderLevel,
      openingStock: fields.openingStock, currentStock: fields.currentStock,
    });
    if (negativeField) {
      return res.status(400).json({ status: false, message: `${negativeField} cannot be negative`, data: null });
    }
    const rangeError = validateStockRange(fields.minStock, fields.maxStock);
    if (rangeError) {
      return res.status(400).json({ status: false, message: rangeError, data: null });
    }

    const updated = await RawSkuModel.update(id, fields);
    deleteRemovedImages(existing.images, fields.images);
    res.json({ status: true, message: 'Raw SKU updated successfully', data: updated });
  } catch (err) {
    sendServerError(res, err);
  }
}

// Manual "Update Stock" action (RawSku.tsx's Action column) - a dedicated Add/Remove-by-
// quantity endpoint rather than routing this through the general updateRawSku, so it can use
// RawSkuModel.adjustStockById's single atomic conditional UPDATE instead of a full-form
// snapshot write (see updateRawSku's own currentStock COALESCE comment for the race that
// would otherwise reopen).
async function adjustRawSkuStock(req, res) {
  try {
    const { id } = req.params;
    const { adjustmentType } = req.body;
    const quantity = Number(req.body.quantity);

    if (adjustmentType !== 'Add' && adjustmentType !== 'Remove') {
      return res.status(400).json({ status: false, message: "adjustmentType must be 'Add' or 'Remove'", data: null });
    }
    if (!(quantity > 0)) {
      return res.status(400).json({ status: false, message: 'Quantity must be greater than 0', data: null });
    }

    const existing = await RawSkuModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Raw SKU not found', data: null });
    }

    const delta = adjustmentType === 'Add' ? quantity : -quantity;
    const updated = await RawSkuModel.adjustStockById(id, delta);
    if (!updated) {
      return res.status(400).json({
        status: false,
        message: `Not enough stock to remove ${quantity} ${existing.unit} - only ${existing.currentStock} ${existing.unit} available`,
        data: null,
      });
    }

    const withJoins = await RawSkuModel.findById(id);
    res.json({ status: true, message: 'Stock updated successfully', data: withJoins });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteRawSku(req, res) {
  try {
    const { id } = req.params;
    const existing = await RawSkuModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Raw SKU not found', data: null });
    }
    // Same reference check as the rename guard in updateRawSku - see describeRawSkuReferences
    // for why an orphaned skuCode is worse than a hard failure.
    const references = await describeRawSkuReferences(existing.skuCode);
    if (references) {
      return res.status(400).json({ status: false, message: `This raw SKU is used in the Product Assembly of ${references} and cannot be deleted - remove those references first`, data: null });
    }

    await RawSkuModel.remove(id);
    deleteAllImages(existing.images);
    res.json({ status: true, message: 'Raw SKU deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getRawSkus, getNextSkuCode, createRawSku, updateRawSku, adjustRawSkuStock, deleteRawSku };
