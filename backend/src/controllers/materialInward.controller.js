const { sendServerError } = require('../utils/errorResponse');
const pool = require('../config/db');
const MaterialInwardModel = require('../models/materialInward.model');
const PurchaseOrderModel = require('../models/purchaseOrder.model');
const RawSkuModel = require('../models/rawSku.model');
const { createInvoiceFromMaterialInward } = require('./invoice.controller');
const { computeOrderTotals } = require('../utils/orderTotals');
const CustomFieldService = require('../services/customField.service');

// computeOrderTotals's grandTotal (subTotal - discount + gst) doesn't know about Material
// Inward's own freightCharge/otherCharges, which aren't derived from items - they're real
// user-entered charges layered on top, so they're added back in here rather than trusted
// as-sent like every other total used to be.
//
// computeOrderTotals is shared with Purchase Order/Sales Order and always prices off
// `orderedQty` unconditionally - for Material Inward that field is the PO line's ORIGINAL
// ordered quantity (kept in the stored items purely for display/pending-qty math), not what
// this specific inward transaction actually received. Left unmapped, every inward - even a
// tiny partial receipt - would be billed at the PO's FULL ordered quantity, and rejected
// (failed-QC) quantity would be billed too even though it's never owed to the vendor. Remap
// to acceptedQty here before totaling, same as MaterialInwardForm.tsx's own live-preview
// totals already do and the same pattern salesOrder.controller.js's dispatchSalesOrder uses
// (remapping to shipQty) - only for this totals computation, the stored `items` keep their
// real orderedQty untouched.
function computeInwardTotals(items, freightCharge, otherCharges) {
  const itemsForTotals = (items || []).map((item) => ({ ...item, orderedQty: Number(item.acceptedQty) || 0 }));
  const base = computeOrderTotals(itemsForTotals);
  const freight = Number(freightCharge) || 0;
  const other = Number(otherCharges) || 0;
  return { ...base, grandTotal: Math.round((base.grandTotal + freight + other) * 100) / 100 };
}

// Only accepted quantity becomes usable Raw SKU stock - rejected quantity failed quality
// check and was never previously reflected anywhere (this whole function was missing before,
// meaning Raw SKU currentStock never moved on receiving at all). `sign` is 1 to apply a set
// of items' stock and -1 to reverse it (used by update/delete so edits/deletes never leave a
// stale delta behind). Always runs against the transaction's own client, never the bare pool.
//
// Returns the list of skuCodes that matched NO Raw SKU row. adjustStockBySkuCode's UPDATE ...
// WHERE "skuCode" = $1 quietly affects zero rows whenever an item's skuCode isn't a real Raw
// SKU code (Material Inward items copy skuCode straight off the linked PO line, and a PO
// line's skuCode is currently a free-typed item name rather than a picked SKU), which made
// "stock never moved on receiving" completely invisible. Collecting the misses lets the
// caller surface them as a warning instead.
async function applyStockForItems(items, sign, client) {
  const unmatchedSkuCodes = [];
  for (const item of items) {
    const qty = Number(item.acceptedQty ?? item.receivedQty ?? 0);
    if (!item.skuCode || !qty) continue;
    const updated = await RawSkuModel.adjustStockBySkuCode(item.skuCode, sign * qty, client);
    if (!updated) unmatchedSkuCodes.push(item.skuCode);
  }
  return unmatchedSkuCodes;
}

// Deliberately a soft warning rather than a hard 400/500: the Material Inward record itself
// and the linked PO's resync are real, wanted writes that already committed in the same
// transaction, and failing the whole save would just block receiving entirely for every PO
// whose lines don't carry real SKU codes (the everyday case today). Same soft-`warning`
// convention createMaterialInward already uses for a failed auto-generated invoice.
function buildStockWarning(unmatchedSkuCodes) {
  const unique = [...new Set(unmatchedSkuCodes.filter(Boolean))];
  if (unique.length === 0) return null;
  return `Stock was not updated for: ${unique.join(', ')} (no matching Raw SKU code) - update it manually or fix the linked SKU.`;
}

// Server-side backstop for the same cap the frontend's Add Material Inward form already
// enforces (MaterialInwardForm.tsx) - without this, a direct API call could receive more
// than a PO line was ever ordered, driving that line's pendingQty negative and inflating Raw
// SKU stock beyond what was actually purchased. `excludeInwardId` is the record being edited
// (so its own already-counted receipt isn't double-subtracted from its own new pending check).
async function validateAgainstPendingQty(purchaseOrderId, items, client, excludeInwardId = null) {
  if (!purchaseOrderId) return;
  // FOR UPDATE, not the plain findById - this locks the PO row for the rest of the
  // transaction, so two concurrent Material Inward saves against the same PO can't both
  // read the same pre-write pendingQty, both pass this check, and both commit (the second
  // one now blocks here until the first's transaction commits or rolls back).
  const po = await PurchaseOrderModel.findByIdForUpdate(purchaseOrderId, client);
  if (!po) return;

  const allInwards = await MaterialInwardModel.getAll(client);
  const alreadyReceivedBySkuId = new Map();
  allInwards
    .filter((mi) => mi.purchaseOrderId === purchaseOrderId && mi.id !== excludeInwardId)
    .flatMap((mi) => mi.items)
    .forEach((item) => {
      alreadyReceivedBySkuId.set(item.skuId, (alreadyReceivedBySkuId.get(item.skuId) || 0) + Number(item.receivedQty || 0));
    });

  const overages = [];
  for (const item of items) {
    const poLine = po.items.find((line) => line.skuId === item.skuId);
    if (!poLine) continue;
    const alreadyReceived = alreadyReceivedBySkuId.get(item.skuId) || 0;
    const pending = poLine.orderedQty - alreadyReceived;
    const requested = Number(item.receivedQty || 0);
    if (requested > pending) {
      overages.push(`${item.itemName || item.skuId}: only ${pending} pending, but ${requested} requested`);
    }
  }
  if (overages.length > 0) {
    const err = new Error(`Received quantity exceeds pending quantity - ${overages.join('; ')}`);
    err.statusCode = 400;
    throw err;
  }
}

// Inward No. mirrors the linked Purchase Order's number (per the user's ask), since a
// Material Inward is the execution of that PO, not an independent transaction. "inwardNo"
// still has a UNIQUE constraint though, so a second/third inward against the same PO gets
// a "-2"/"-3" suffix instead of colliding with the first. No PO linked -> falls back to the
// existing MI-{year}-{seq} auto-generation.
async function generateInwardNo(purchaseOrderId, purchaseOrderNo) {
  if (!purchaseOrderId || !purchaseOrderNo) {
    return MaterialInwardModel.getNextInwardNo();
  }
  const existingCount = await MaterialInwardModel.countByPurchaseOrder(purchaseOrderId);
  return existingCount === 0 ? purchaseOrderNo : `${purchaseOrderNo}-${existingCount + 1}`;
}

// Material Inward is the execution of an approved Purchase Order, so the PO's own
// receivedQty/pendingQty/status must reflect reality after every inward write. This
// recomputes from scratch (sums every live inward against the PO) rather than
// accumulating deltas, so edits/deletes never risk double-counting.
async function resyncPurchaseOrderTotals(purchaseOrderId, client) {
  if (!purchaseOrderId) return;

  // FOR UPDATE here too, not just in validateAgainstPendingQty above - deleteMaterialInward
  // calls straight into this without going through that check first, so this needs its own
  // lock rather than relying on one already being held.
  const po = await PurchaseOrderModel.findByIdForUpdate(purchaseOrderId, client);
  if (!po || po.status === 'Cancelled') return;

  const allInwards = await MaterialInwardModel.getAll(client);
  const relevantInwards = allInwards.filter((mi) => mi.purchaseOrderId === purchaseOrderId);
  const relevantItems = relevantInwards.flatMap((mi) => mi.items);

  // Matched by skuId, not itemName - two PO lines could share a display name (two separate
  // batches of the same raw material ordered on different lines), which would make a
  // name-based match ambiguous and double-count a single receipt against both lines.
  // purchaseOrder.controller.js now rejects duplicate skuIds on a PO at write-time, so skuId
  // is a reliable per-line key here.
  const updatedItems = po.items.map((item) => {
    const receivedQty = relevantItems
      .filter((mi) => mi.skuId === item.skuId)
      .reduce((sum, mi) => sum + mi.receivedQty, 0);
    return { ...item, receivedQty, pendingQty: item.orderedQty - receivedQty };
  });
  // Fully received = every line's pendingQty is down to zero (or below, if something was
  // over-received). A PARTIAL receipt must NOT flip the PO to 'Received': that used to be
  // terminal (ALLOWED_PO_STATUS_TRANSITIONS lets Received go nowhere but Received) and also
  // dropped the PO out of Material Inward's own PO picker, so the remaining quantity could
  // never be received and the PO could no longer be cancelled. Staying 'Sent' until fully
  // received is the minimal correct fix - there's no 'Partially Received' value anywhere in
  // the status enum (purchaseOrder.controller.js's VALID_STATUSES, purchaseOrderService.ts's
  // PurchaseOrderStatus) to introduce without a migration and a sweep of every status-based
  // UI condition.
  const isFullyReceived = updatedItems.length > 0 && updatedItems.every((item) => item.pendingQty <= 0);

  // Only the Sent<->Received transition is auto-managed (so a later edit/delete that
  // un-fulfills a PO correctly reverts it, not just moves status forward one-way). Draft/
  // Cancelled are left alone - they aren't reachable from Material Inward's PO picker
  // anyway (it filters those out), but this keeps the auto-logic from ever overriding them.
  let status = po.status;
  if (po.status === 'Sent' || po.status === 'Received') {
    status = isFullyReceived ? 'Received' : 'Sent';
  }

  // Every key here must be one PurchaseOrderModel.update actually consumes - it writes a
  // fixed column list, so any field omitted from this object arrives as `undefined` and is
  // sent to Postgres as NULL. That's exactly how "shippingDate" (absent here until now) got
  // permanently wiped off the PO on every single Material Inward create/update/delete. The
  // paymentTerms/currency/approvedBy/approvedAt keys that used to be here were the mirror
  // image of the same confusion - the model has no such columns, so they were pure noise.
  await PurchaseOrderModel.update(purchaseOrderId, {
    vendorId: po.vendorId,
    poDate: po.poDate,
    expectedDeliveryDate: po.expectedDeliveryDate,
    shippingDate: po.shippingDate,
    deliveryAddress: po.deliveryAddress,
    status,
    paymentStatus: po.paymentStatus,
    paidAmount: po.paidAmount,
    items: updatedItems,
    totalItems: po.totalItems,
    totalQty: po.totalQty,
    subTotal: po.subTotal,
    discountAmount: po.discountAmount,
    gstAmount: po.gstAmount,
    grandTotal: po.grandTotal,
    remarks: po.remarks,
    createdBy: po.createdBy,
  }, client);
}

async function getMaterialInwards(req, res) {
  try {
    const materialInwards = await MaterialInwardModel.getAll();
    res.json({ status: true, message: 'Material inwards fetched successfully', data: materialInwards });
  } catch (err) {
    sendServerError(res, err);
  }
}

// create/update/delete all run their record write + stock adjustment + PO resync as one
// transaction now (previously three-plus separate autocommit pool queries) - a failure
// partway through used to leave a Material Inward record persisted with only some of its
// stock applied, or (on update) stock double-reversed/not-reversed at all, with the client
// seeing a 500 as if nothing had happened. Matches the BEGIN/COMMIT/ROLLBACK/finally pattern
// already used by bom.controller.js's completeBomItem/revertBomItem.
async function createMaterialInward(req, res) {
  const { vendorId, warehouseId, receivedDate } = req.body;
  if (!vendorId || !warehouseId || !receivedDate) {
    return res.status(400).json({ status: false, message: 'vendorId, warehouseId and receivedDate are required', data: null });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inwardNo = await generateInwardNo(req.body.purchaseOrderId || null, req.body.purchaseOrderNo || null);
    const items = req.body.items || [];
    const freightCharge = req.body.freightCharge || 0;
    const otherCharges = req.body.otherCharges || 0;
    const totals = computeInwardTotals(items, freightCharge, otherCharges);
    const fields = {
      purchaseOrderId: req.body.purchaseOrderId || null,
      purchaseOrderNo: req.body.purchaseOrderNo || null,
      vendorId,
      vendorName: req.body.vendorName || null,
      receivedDate,
      invoiceNo: req.body.invoiceNo || null,
      invoiceDate: req.body.invoiceDate || null,
      challanNo: req.body.challanNo || null,
      vehicleNo: req.body.vehicleNo || null,
      warehouseId,
      items,
      ...totals,
      freightCharge,
      otherCharges,
      remarks: req.body.remarks || null,
      // Derived from the authenticated session, not trusted from the request body - see
      // purchaseOrder.controller.js's identical fix for why.
      receivedBy: req.user.userName,
    };

    await validateAgainstPendingQty(fields.purchaseOrderId, items, client);

    const created = await MaterialInwardModel.create(inwardNo, fields, client);
    const stockWarning = buildStockWarning(await applyStockForItems(created.items, 1, client));
    await resyncPurchaseOrderTotals(created.purchaseOrderId, client);
    await CustomFieldService.saveValues('materialInward', created.id, req.body.customFields, client);
    const withCustomFields = await MaterialInwardModel.findById(created.id, client);

    await client.query('COMMIT');

    // Best-effort, deliberately OUTSIDE the transaction and after COMMIT: the Material
    // Inward save must succeed regardless of whether invoice auto-generation works. The
    // failure is still surfaced to the caller via `warning` (not just console.error'd) so it
    // doesn't silently vanish - the frontend shows it alongside the success toast.
    let invoiceWarning = null;
    try {
      await createInvoiceFromMaterialInward(created);
    } catch (invoiceErr) {
      console.error('Failed to auto-generate invoice for material inward', created.id, invoiceErr);
      invoiceWarning = 'Material inward saved, but its Purchase Invoice could not be auto-generated. Please create it manually from the Invoices page.';
    }
    // Both soft failures share the single `warning` field the client already renders - joined
    // rather than one overwriting the other, since they're independent and both actionable.
    const warning = [stockWarning, invoiceWarning].filter(Boolean).join(' ') || null;
    res.status(201).json({ status: true, message: 'Material inward created successfully', data: withCustomFields, warning });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.statusCode || 500).json({ status: false, message: err.message, data: null });
  } finally {
    client.release();
  }
}

async function updateMaterialInward(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await MaterialInwardModel.findById(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Material inward not found', data: null });
    }

    const body = req.body;
    const items = body.items ?? existing.items;
    const freightCharge = body.freightCharge ?? existing.freightCharge;
    const otherCharges = body.otherCharges ?? existing.otherCharges;
    const totals = computeInwardTotals(items, freightCharge, otherCharges);
    const fields = {
      purchaseOrderId: body.purchaseOrderId ?? existing.purchaseOrderId,
      purchaseOrderNo: body.purchaseOrderNo ?? existing.purchaseOrderNo,
      vendorId: body.vendorId ?? existing.vendorId,
      vendorName: body.vendorName ?? existing.vendorName,
      receivedDate: body.receivedDate ?? existing.receivedDate,
      invoiceNo: body.invoiceNo ?? existing.invoiceNo,
      invoiceDate: body.invoiceDate ?? existing.invoiceDate,
      challanNo: body.challanNo ?? existing.challanNo,
      vehicleNo: body.vehicleNo ?? existing.vehicleNo,
      warehouseId: body.warehouseId ?? existing.warehouseId,
      items,
      ...totals,
      freightCharge,
      otherCharges,
      remarks: body.remarks ?? existing.remarks,
      // Never taken from the request body on the update path - the receiver is whoever
      // actually received the goods, established once at create time from the authenticated
      // session, and editing the record later must not rewrite it. MaterialInwardForm.tsx
      // sends a hard-coded 'Admin User' in its payload for both create and update, so
      // honouring the body here overwrote the real receiver on every single edit. Same
      // "don't trust client-supplied identity fields" reasoning as the create path.
      receivedBy: existing.receivedBy,
    };

    // Exclude this record's own already-counted receipt from the pending-qty check, since
    // it's being replaced by `items` here, not added on top of itself.
    await validateAgainstPendingQty(fields.purchaseOrderId, items, client, existing.id);

    const updated = await MaterialInwardModel.update(id, fields, client);
    // Reverse the old items' stock effect and re-apply the new items' effect, rather than
    // diffing - simplest thing that's correct even when SKUs/quantities/line count all
    // change between the old and new items array.
    await applyStockForItems(existing.items, -1, client);
    // Only the NEW items' misses are reported: a reversal that matches nothing is the same
    // no-op the original apply was, so warning about it twice would just be noise.
    const stockWarning = buildStockWarning(await applyStockForItems(updated.items, 1, client));
    await resyncPurchaseOrderTotals(updated.purchaseOrderId, client);
    if (existing.purchaseOrderId && existing.purchaseOrderId !== updated.purchaseOrderId) {
      await resyncPurchaseOrderTotals(existing.purchaseOrderId, client);
    }
    await CustomFieldService.saveValues('materialInward', id, body.customFields, client);
    const withCustomFields = await MaterialInwardModel.findById(id, client);

    await client.query('COMMIT');
    res.json({ status: true, message: 'Material inward updated successfully', data: withCustomFields, warning: stockWarning });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.statusCode || 500).json({ status: false, message: err.message, data: null });
  } finally {
    client.release();
  }
}

async function deleteMaterialInward(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const existing = await MaterialInwardModel.findById(id, client);
    if (!existing) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: false, message: 'Material inward not found', data: null });
    }

    await MaterialInwardModel.remove(id, client);
    await applyStockForItems(existing.items, -1, client);
    await resyncPurchaseOrderTotals(existing.purchaseOrderId, client);

    await client.query('COMMIT');
    res.json({ status: true, message: 'Material inward deleted successfully', data: null });
  } catch (err) {
    await client.query('ROLLBACK');
    sendServerError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { getMaterialInwards, createMaterialInward, updateMaterialInward, deleteMaterialInward };
