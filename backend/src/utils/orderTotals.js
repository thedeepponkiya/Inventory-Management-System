// Shared by purchaseOrder.controller.js, salesOrder.controller.js and
// materialInward.controller.js. All three previously trusted whatever
// totalItems/totalQty/subTotal/discountAmount/gstAmount/grandTotal the client sent as-is
// (only `|| 0` if missing, never checked against the actual `items` array) - a direct API
// call could send real items but a wildly different grandTotal, and it would be stored and
// shown as truth everywhere (Dashboard KPIs, PDFs, invoices). Recomputing here instead of
// trusting req.body closes that off; every line-total/summary figure this app persists now
// comes from one formula, matching what the frontend forms already compute for their own
// live preview (SalesOrderForm.tsx / PurchaseOrderForm.tsx / MaterialInwardForm.tsx).
function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// items: array of { orderedQty, unitPrice, discountPercent, gstPercent, ... } - the shared
// shape across Purchase Order / Sales Order / Material Inward line items.
function computeOrderTotals(items) {
  let totalQty = 0;
  let subTotal = 0;
  let discountAmount = 0;
  let gstAmount = 0;

  for (const item of items || []) {
    const orderedQty = Number(item.orderedQty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPercent = Number(item.discountPercent) || 0;
    const gstPercent = Number(item.gstPercent) || 0;

    const lineGross = orderedQty * unitPrice;
    const lineDiscount = (lineGross * discountPercent) / 100;
    const taxable = lineGross - lineDiscount;
    const lineGst = (taxable * gstPercent) / 100;

    totalQty += orderedQty;
    subTotal += lineGross;
    discountAmount += lineDiscount;
    gstAmount += lineGst;
  }

  // Round each stored component FIRST, then combine those already-rounded values into
  // grandTotal - not the other way around. Rounding subTotal/discountAmount/gstAmount
  // independently for storage while computing grandTotal from the raw unrounded sums (the
  // previous behavior) meant round2(subTotal) - round2(discount) + round2(gst) could differ
  // from the stored grandTotal by a cent whenever a line's percentage produced a repeating
  // decimal - so a PDF/invoice summing the displayed component fields wouldn't always foot
  // exactly to the displayed grand total. Rounding first guarantees the three stored fields
  // always sum to exactly the stored grandTotal.
  const roundedSubTotal = round2(subTotal);
  const roundedDiscountAmount = round2(discountAmount);
  const roundedGstAmount = round2(gstAmount);
  const grandTotal = round2(roundedSubTotal - roundedDiscountAmount + roundedGstAmount);

  return {
    totalItems: (items || []).length,
    totalQty,
    subTotal: roundedSubTotal,
    discountAmount: roundedDiscountAmount,
    gstAmount: roundedGstAmount,
    grandTotal,
  };
}

// Derives Unpaid/Partial/Paid from paidAmount vs. the order's own grandTotal, instead of
// trusting whatever paymentStatus a client sends - same "recompute the derived value
// ourselves" reasoning as computeOrderTotals above. A paidAmount of 0 is Unpaid, anything at
// or past grandTotal is Paid (rounded to 2dp first so a 0.001 float rounding wobble doesn't
// leave an otherwise-fully-paid order stuck at Partial), and anything in between is Partial.
function derivePaymentStatus(paidAmount, grandTotal) {
  const paid = round2(paidAmount);
  const total = round2(grandTotal);
  if (paid <= 0) return 'Unpaid';
  if (total <= 0) return 'Paid'; // nothing owed on this order, but a payment was recorded
  if (paid >= total) return 'Paid';
  return 'Partial';
}

module.exports = { computeOrderTotals, derivePaymentStatus };
