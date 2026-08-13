const { sendServerError } = require('../utils/errorResponse');
const InvoiceModel = require('../models/invoice.model');
const LocationModel = require('../models/location.model');
const { derivePaymentStatus } = require('../utils/orderTotals');

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// Unlike Purchase/Sales Order, an Invoice has no items array of its own to recompute a total
// from - its subTotal/discountAmount/gstAmount/freightCharge/otherCharges are trusted as
// entered (same as before), but grandTotal/dueAmount/paymentStatus are now always DERIVED
// from those instead of separately trusted from the request body, closing the gap where a
// client could previously save e.g. paidAmount = grandTotal while paymentStatus stayed
// 'Unpaid', or set paidAmount above grandTotal for a negative dueAmount with nothing to catch
// it - matching the same "recompute, don't trust the client" treatment orderTotals.js already
// gives Purchase/Sales Order/Material Inward.
function deriveInvoiceFinancials({ subTotal, discountAmount, gstAmount, freightCharge, otherCharges, paidAmount }) {
  const grandTotal = round2((Number(subTotal) || 0) - (Number(discountAmount) || 0) + (Number(gstAmount) || 0) + (Number(freightCharge) || 0) + (Number(otherCharges) || 0));
  const paid = round2(paidAmount);
  if (paid > grandTotal) {
    const err = new Error(`Paid amount (${paid}) cannot exceed the invoice's grand total (${grandTotal})`);
    err.statusCode = 400;
    throw err;
  }
  return {
    grandTotal,
    paidAmount: paid,
    dueAmount: round2(grandTotal - paid),
    paymentStatus: derivePaymentStatus(paid, grandTotal),
  };
}

// Auto-generates a Purchase invoice from a just-created Material Inward (create-only - see
// materialInward.controller.js's createMaterialInward). After this the invoice is its own
// independently-editable financial record; later Material Inward edits/deletes never touch it.
async function createInvoiceFromMaterialInward(materialInward) {
  const location = materialInward.warehouseId ? await LocationModel.findById(materialInward.warehouseId) : null;
  const invoiceNo = await InvoiceModel.getNextInvoiceNo();
  const grandTotal = materialInward.grandTotal;

  return InvoiceModel.create(invoiceNo, {
    invoiceDate: new Date().toISOString().slice(0, 10),
    invoiceType: 'Purchase',
    referenceNo: materialInward.purchaseOrderNo || null,
    materialInwardNo: materialInward.inwardNo,
    customerSupplier: materialInward.vendorName,
    location: location?.location || null,
    totalQty: materialInward.totalQty,
    subTotal: materialInward.subTotal,
    unitPrice: 0,
    discountPercent: 0,
    discountAmount: materialInward.discountAmount,
    gstPercent: 0,
    gstAmount: materialInward.gstAmount,
    freightCharge: materialInward.freightCharge,
    otherCharges: materialInward.otherCharges,
    grandTotal,
    paidAmount: 0,
    dueAmount: grandTotal,
    dueDate: null,
    paymentTerms: null,
    paymentStatus: 'Unpaid',
    remarks: null,
    createdBy: materialInward.receivedBy,
  });
}

async function getInvoices(req, res) {
  try {
    const invoices = await InvoiceModel.getAll();
    res.json({ status: true, message: 'Invoices fetched successfully', data: invoices });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createInvoice(req, res) {
  try {
    const { invoiceDate } = req.body;
    if (!invoiceDate) {
      return res.status(400).json({ status: false, message: 'invoiceDate is required', data: null });
    }

    const invoiceNo = await InvoiceModel.getNextInvoiceNo();
    const financials = deriveInvoiceFinancials({
      subTotal: req.body.subTotal || 0,
      discountAmount: req.body.discountAmount || 0,
      gstAmount: req.body.gstAmount || 0,
      freightCharge: req.body.freightCharge || 0,
      otherCharges: req.body.otherCharges || 0,
      paidAmount: req.body.paidAmount || 0,
    });
    const fields = {
      invoiceDate,
      invoiceType: req.body.invoiceType || 'Purchase',
      referenceNo: req.body.referenceNo || null,
      materialInwardNo: req.body.materialInwardNo || null,
      customerSupplier: req.body.customerSupplier || null,
      location: req.body.location || null,
      totalQty: req.body.totalQty || 0,
      subTotal: req.body.subTotal || 0,
      unitPrice: req.body.unitPrice || 0,
      discountPercent: req.body.discountPercent || 0,
      discountAmount: req.body.discountAmount || 0,
      gstPercent: req.body.gstPercent || 0,
      gstAmount: req.body.gstAmount || 0,
      freightCharge: req.body.freightCharge || 0,
      otherCharges: req.body.otherCharges || 0,
      ...financials,
      dueDate: req.body.dueDate || null,
      paymentTerms: req.body.paymentTerms || null,
      remarks: req.body.remarks || null,
      // Derived from the authenticated session, not trusted from the request body - see
      // purchaseOrder.controller.js's identical fix for why.
      createdBy: req.user.userName,
    };

    const created = await InvoiceModel.create(invoiceNo, fields);
    res.status(201).json({ status: true, message: 'Invoice created successfully', data: created });
  } catch (err) {
    res.status(err.statusCode || 500).json({ status: false, message: err.message, data: null });
  }
}

async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const existing = await InvoiceModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Invoice not found', data: null });
    }

    const body = req.body;
    const financials = deriveInvoiceFinancials({
      subTotal: body.subTotal ?? existing.subTotal,
      discountAmount: body.discountAmount ?? existing.discountAmount,
      gstAmount: body.gstAmount ?? existing.gstAmount,
      freightCharge: body.freightCharge ?? existing.freightCharge,
      otherCharges: body.otherCharges ?? existing.otherCharges,
      paidAmount: body.paidAmount ?? existing.paidAmount,
    });
    const fields = {
      invoiceDate: body.invoiceDate ?? existing.invoiceDate,
      invoiceType: body.invoiceType ?? existing.invoiceType,
      referenceNo: body.referenceNo ?? existing.referenceNo,
      materialInwardNo: body.materialInwardNo ?? existing.materialInwardNo,
      customerSupplier: body.customerSupplier ?? existing.customerSupplier,
      location: body.location ?? existing.location,
      totalQty: body.totalQty ?? existing.totalQty,
      subTotal: body.subTotal ?? existing.subTotal,
      unitPrice: body.unitPrice ?? existing.unitPrice,
      discountPercent: body.discountPercent ?? existing.discountPercent,
      discountAmount: body.discountAmount ?? existing.discountAmount,
      gstPercent: body.gstPercent ?? existing.gstPercent,
      gstAmount: body.gstAmount ?? existing.gstAmount,
      freightCharge: body.freightCharge ?? existing.freightCharge,
      otherCharges: body.otherCharges ?? existing.otherCharges,
      ...financials,
      dueDate: body.dueDate ?? existing.dueDate,
      paymentTerms: body.paymentTerms ?? existing.paymentTerms,
      remarks: body.remarks ?? existing.remarks,
      createdBy: body.createdBy ?? existing.createdBy,
    };

    const updated = await InvoiceModel.update(id, fields);
    res.json({ status: true, message: 'Invoice updated successfully', data: updated });
  } catch (err) {
    res.status(err.statusCode || 500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteInvoice(req, res) {
  try {
    const { id } = req.params;
    const existing = await InvoiceModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'Invoice not found', data: null });
    }

    await InvoiceModel.remove(id);
    res.json({ status: true, message: 'Invoice deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { createInvoiceFromMaterialInward, getInvoices, createInvoice, updateInvoice, deleteInvoice };
