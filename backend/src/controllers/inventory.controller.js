const { sendServerError } = require('../utils/errorResponse');
const InventoryModel = require('../models/inventory.model');
const { deleteAllImages, deleteRemovedImages } = require('../utils/imageCleanup.util');
const CustomFieldService = require('../services/customField.service');
const { findNegativeField, validateStockRange, findInvalidAssemblyLine } = require('../utils/stockValidation.util');
const BomModel = require('../models/bom.model');
const SalesOrderModel = require('../models/salesOrder.model');

// An Inventory item's skuId is referenced BY VALUE, not by a real foreign key:
// ims_bom.items[].skuId and ims_sales_order.items[].skuId are plain strings inside JSONB
// arrays. Nothing in the database stops a rename or a delete from orphaning them, and the
// helper that follows those references (InventoryModel.adjustStockBySkuId, used by BOM
// completion and Sales Order dispatch) silently NO-OPS when the skuId matches no row - so
// after an unguarded rename/delete the stock movement just vanishes, with no error, forever.
// This is the same "don't let a delete orphan its dependents" guard
// purchaseOrder.controller.js's deletePurchaseOrder applies against Material Inwards, just
// expressed over JSONB arrays instead of an FK column. Returns a human-readable
// "N BOM(s) and N Sales Order(s)" phrase, or null when nothing references the SKU.
async function describeInventorySkuReferences(skuId) {
  const [bomCount, salesOrderCount] = await Promise.all([
    BomModel.countBySkuId(skuId),
    SalesOrderModel.countBySkuId(skuId),
  ]);
  if (bomCount === 0 && salesOrderCount === 0) return null;
  const parts = [];
  if (bomCount > 0) parts.push(`${bomCount} BOM${bomCount === 1 ? '' : 's'}`);
  if (salesOrderCount > 0) parts.push(`${salesOrderCount} Sales Order${salesOrderCount === 1 ? '' : 's'}`);
  return parts.join(' and ');
}

async function getInventories(req, res) {
  try {
    const inventories = await InventoryModel.getAll();
    res.json({ status: true, message: 'Inventory items fetched successfully', data: inventories });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function getNextSkuId(req, res) {
  try {
    const skuId = await InventoryModel.getNextSkuId();
    res.json({ status: true, message: 'Next SKU ID fetched successfully', data: { skuId } });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createInventory(req, res) {
  try {
    const { productName } = req.body;
    if (!productName) {
      return res.status(400).json({ status: false, message: 'productName is required', data: null });
    }

    // Honors a user-typed SKU ID (the "SKU ID" field is now editable at create time) if
    // provided and not already taken - re-checked here (not just trusted from the previewed
    // value shown in the form) since another item could have claimed it in the meantime.
    // Falls back to auto-generating one, same as before, when the field was left blank.
    let skuId = req.body.skuId ? String(req.body.skuId).trim() : '';
    if (skuId) {
      if (await InventoryModel.findBySkuId(skuId)) {
        return res.status(400).json({ status: false, message: `SKU ID "${skuId}" is already in use - choose a different one`, data: null });
      }
    } else {
      skuId = await InventoryModel.getNextSkuId();
    }
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

    // Frontend-only guarded before now (InventoryHome.tsx's numeric fields had no `min`, and
    // nothing checked the min/max relationship at all) - see stockValidation.util.js for why
    // each of these matters, especially the assembly line check.
    const negativeField = findNegativeField({
      quantity: fields.quantity, unitCost: fields.unitCost, sellingCost: fields.sellingCost,
      minStock: fields.minStock, maxStock: fields.maxStock, openingStock: fields.openingStock,
    });
    if (negativeField) {
      return res.status(400).json({ status: false, message: `${negativeField} cannot be negative`, data: null });
    }
    const rangeError = validateStockRange(fields.minStock, fields.maxStock);
    if (rangeError) {
      return res.status(400).json({ status: false, message: rangeError, data: null });
    }
    if (findInvalidAssemblyLine(fields.assembly)) {
      return res.status(400).json({ status: false, message: 'Every Product Assembly line needs a quantity greater than 0', data: null });
    }

    const created = await InventoryModel.create(skuId, fields);
    await CustomFieldService.saveValues('inventory', created.id, req.body.customFields);
    const withCustomFields = await InventoryModel.findById(created.id);
    res.status(201).json({ status: true, message: 'Inventory item created successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
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

    // SKU ID is now editable after creation too (the field is unlocked in the Edit dialog) -
    // re-checked against other rows here the same way createInventory checks a user-typed
    // skuId, just excluding this row's own current value from the conflict check.
    if (body.skuId !== undefined && body.skuId !== existing.skuId) {
      const skuId = String(body.skuId).trim();
      if (!skuId) {
        return res.status(400).json({ status: false, message: 'SKU ID cannot be empty', data: null });
      }
      const conflict = await InventoryModel.findBySkuId(skuId);
      if (conflict && conflict.id !== Number(id)) {
        return res.status(400).json({ status: false, message: `SKU ID "${skuId}" is already in use - choose a different one`, data: null });
      }
      // Only reached when the code is actually CHANGING (same condition as the uniqueness
      // check above), so a save that doesn't touch the SKU ID costs zero extra queries.
      const references = await describeInventorySkuReferences(existing.skuId);
      if (references) {
        return res.status(400).json({ status: false, message: `Cannot rename this SKU ID - it's referenced by ${references}. Remove those references first.`, data: null });
      }
      body.skuId = skuId;
    }

    const fields = {
      skuId: body.skuId ?? existing.skuId,
      images: body.images ?? existing.images,
      productName: body.productName ?? existing.productName,
      categoryName: body.categoryName ?? existing.categoryName,
      productType: body.productType ?? existing.productType,
      barcode: body.barcode ?? existing.barcode,
      // null (not existing.quantity) when the client didn't send a value - the model's UPDATE
      // COALESCEs this against the LIVE column value at write time instead of the value read
      // here moments earlier, so an unrelated field edit run concurrently with a BOM
      // completion/dispatch touching this same item's stock can't silently overwrite it with
      // a stale snapshot. Same fix as rawSku.controller.js's updateRawSku.
      quantity: body.quantity ?? null,
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

    // Same checks as createInventory - `fields.quantity` can legitimately be null here (see
    // the comment above it), and findNegativeField already skips null/undefined.
    const negativeField = findNegativeField({
      quantity: fields.quantity, unitCost: fields.unitCost, sellingCost: fields.sellingCost,
      minStock: fields.minStock, maxStock: fields.maxStock, openingStock: fields.openingStock,
    });
    if (negativeField) {
      return res.status(400).json({ status: false, message: `${negativeField} cannot be negative`, data: null });
    }
    const rangeError = validateStockRange(fields.minStock, fields.maxStock);
    if (rangeError) {
      return res.status(400).json({ status: false, message: rangeError, data: null });
    }
    if (findInvalidAssemblyLine(fields.assembly)) {
      return res.status(400).json({ status: false, message: 'Every Product Assembly line needs a quantity greater than 0', data: null });
    }

    await InventoryModel.update(id, fields);
    deleteRemovedImages(existing.images, fields.images);
    await CustomFieldService.saveValues('inventory', id, req.body.customFields);
    const withCustomFields = await InventoryModel.findById(id);
    res.json({ status: true, message: 'Inventory item updated successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteInventory(req, res) {
  try {
    const { id } = req.params;
    const existing = await InventoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Inventory item not found', data: null });
    }
    // Same reference check as the rename guard in updateInventory - see
    // describeInventorySkuReferences for why an orphaned skuId is worse than a hard failure.
    const references = await describeInventorySkuReferences(existing.skuId);
    if (references) {
      return res.status(400).json({ status: false, message: `This inventory item is referenced by ${references} and cannot be deleted - remove those references first`, data: null });
    }

    await InventoryModel.remove(id);
    deleteAllImages(existing.images);
    res.json({ status: true, message: 'Inventory item deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getInventories, getNextSkuId, createInventory, updateInventory, deleteInventory };
