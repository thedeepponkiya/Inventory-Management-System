// Closed per-entity list of the REAL, already-existing fields a form shows today - the set of
// "fieldKey"s a label override is ever allowed to target (fieldLabelOverride writes are
// rejected for anything not on this list, same whitelist-first approach as
// customFieldEntities.util.js's table map). This never grows on its own from a request; each
// entry here is transcribed directly from that entity's own column config in
// CommonUtilities.tsx (or, for CRM, that page's own inline columns) - see the comment above
// each block for exactly which function it mirrors, so keeping this in sync when a form's own
// columns change is a matter of re-checking that one function.
//
// Listed here for every form (so every form's fields show up to rename in Developer Admin's
// Custom Fields panel), but as of this writing only BOM's forms actually LOOK UP an override
// when rendering (see Bom.tsx / getBomColumns's `getLabel` param and useFieldLabels.ts) - the
// same "prove one form fully, then extend" approach used for Custom Fields itself. Renaming a
// field on any other entity here saves correctly and shows up as "Renamed" in the panel, but
// won't visibly change that entity's own page until that page is wired the same way BOM was.
const BUILT_IN_FIELDS = {
  // getPurchaseOrderColumns
  purchaseOrder: [
    { fieldKey: 'poNo', defaultLabel: 'PO No.' },
    { fieldKey: 'poDate', defaultLabel: 'PO Date' },
    { fieldKey: 'vendorName', defaultLabel: 'Vendor' },
    { fieldKey: 'expectedDeliveryDate', defaultLabel: 'Expected Delivery' },
    { fieldKey: 'status', defaultLabel: 'Status' },
    { fieldKey: 'createdBy', defaultLabel: 'Created By' },
    { fieldKey: 'createdAt', defaultLabel: 'Created Date' },
    { fieldKey: 'paymentStatus', defaultLabel: 'Payment Status' },
    { fieldKey: 'paidAmount', defaultLabel: 'Paid Amount' },
    { fieldKey: 'grandTotal', defaultLabel: 'Grand Total' },
  ],
  // getSalesOrderColumns
  salesOrder: [
    { fieldKey: 'soNo', defaultLabel: 'SO No.' },
    { fieldKey: 'customerName', defaultLabel: 'Customer' },
    { fieldKey: 'orderDate', defaultLabel: 'SO Date' },
    { fieldKey: 'deliveryDate', defaultLabel: 'Expected Delivery' },
    { fieldKey: 'status', defaultLabel: 'Order Status' },
    { fieldKey: 'createdBy', defaultLabel: 'Created By' },
    { fieldKey: 'createdAt', defaultLabel: 'Created Date' },
    { fieldKey: 'paymentStatus', defaultLabel: 'Payment Status' },
    { fieldKey: 'paidAmount', defaultLabel: 'Paid Amount' },
    { fieldKey: 'grandTotal', defaultLabel: 'Grand Total' },
  ],
  // getMaterialInwardColumns
  materialInward: [
    { fieldKey: 'inwardNo', defaultLabel: 'Inward No.' },
    { fieldKey: 'receivedDate', defaultLabel: 'Received Date' },
    { fieldKey: 'vendorName', defaultLabel: 'Vendor' },
    { fieldKey: 'purchaseOrderNo', defaultLabel: 'PO No.' },
    { fieldKey: 'grandTotal', defaultLabel: 'Grand Total' },
    { fieldKey: 'receivedBy', defaultLabel: 'Received By' },
    { fieldKey: 'createdAt', defaultLabel: 'Created Date' },
  ],
  // getInvoiceColumns
  invoice: [
    { fieldKey: 'invoiceNo', defaultLabel: 'Invoice No.' },
    { fieldKey: 'invoiceDate', defaultLabel: 'Invoice Date' },
    { fieldKey: 'invoiceType', defaultLabel: 'Type' },
    { fieldKey: 'customerSupplier', defaultLabel: 'Customer / Supplier' },
    { fieldKey: 'materialInwardNo', defaultLabel: 'Material Inward No.' },
    { fieldKey: 'grandTotal', defaultLabel: 'Grand Total' },
    { fieldKey: 'paymentStatus', defaultLabel: 'Payment Status' },
    { fieldKey: 'createdAt', defaultLabel: 'Created Date' },
  ],
  // getInventoryHomeColumns
  inventory: [
    { fieldKey: 'skuId', defaultLabel: 'SKU (ID)' },
    { fieldKey: 'productName', defaultLabel: 'Product Name' },
    { fieldKey: 'categoryName', defaultLabel: 'Category' },
    { fieldKey: 'productType', defaultLabel: 'Product Type' },
    { fieldKey: 'barcode', defaultLabel: 'Barcode' },
    { fieldKey: 'quantity', defaultLabel: 'Current Stock' },
    { fieldKey: 'unit', defaultLabel: 'Unit' },
    { fieldKey: 'locationName', defaultLabel: 'Location' },
    { fieldKey: 'status', defaultLabel: 'Status' },
    { fieldKey: 'unitCost', defaultLabel: 'Product Cost' },
    { fieldKey: 'sellingCost', defaultLabel: 'Selling Cost' },
    { fieldKey: 'createdDate', defaultLabel: 'Created Date' },
  ],
  // getUsersColumns
  user: [
    { fieldKey: 'userCode', defaultLabel: 'User Code' },
    { fieldKey: 'fullName', defaultLabel: 'Name' },
    { fieldKey: 'email', defaultLabel: 'Email' },
    { fieldKey: 'phone', defaultLabel: 'Phone' },
    { fieldKey: 'roleId', defaultLabel: 'Role' },
    { fieldKey: 'departmentId', defaultLabel: 'Department' },
    { fieldKey: 'status', defaultLabel: 'Status' },
    { fieldKey: 'lastLogin', defaultLabel: 'Last Login' },
  ],
  // getBomColumns + Bom.tsx's own form <label> tags - the one entity actually wired up to
  // show these overrides live (see the file header comment above).
  bom: [
    { fieldKey: 'bomCode', defaultLabel: 'BOM Code' },
    { fieldKey: 'productName', defaultLabel: 'Product Name' },
    { fieldKey: 'productSku', defaultLabel: 'Product SKU' },
    { fieldKey: 'outputQty', defaultLabel: 'Output Qty' },
    { fieldKey: 'unit', defaultLabel: 'Unit' },
    { fieldKey: 'items', defaultLabel: 'Components' },
    { fieldKey: 'createdAt', defaultLabel: 'Created Date' },
    { fieldKey: 'status', defaultLabel: 'Status' },
  ],
  // CrmLeadsPage.tsx's inline `columns`
  crmLead: [
    { fieldKey: 'leadCode', defaultLabel: 'Lead Code' },
    { fieldKey: 'name', defaultLabel: 'Name' },
    { fieldKey: 'company', defaultLabel: 'Company' },
    { fieldKey: 'stageName', defaultLabel: 'Stage' },
    { fieldKey: 'sourceName', defaultLabel: 'Source' },
    { fieldKey: 'assignedToName', defaultLabel: 'Assigned To' },
    { fieldKey: 'priority', defaultLabel: 'Priority' },
    { fieldKey: 'value', defaultLabel: 'Value' },
    { fieldKey: 'status', defaultLabel: 'Status' },
  ],
  // CrmFollowupsPage.tsx's inline `columns`
  crmFollowup: [
    { fieldKey: 'leadName', defaultLabel: 'Lead' },
    { fieldKey: 'assignedToName', defaultLabel: 'Assigned To' },
    { fieldKey: 'dueAt', defaultLabel: 'Due At' },
    { fieldKey: 'type', defaultLabel: 'Type' },
    { fieldKey: 'notes', defaultLabel: 'Notes' },
    { fieldKey: 'status', defaultLabel: 'Status' },
  ],
};

function getBuiltInFields(entityKey) {
  return BUILT_IN_FIELDS[entityKey] ?? [];
}

function isValidBuiltInField(entityKey, fieldKey) {
  return getBuiltInFields(entityKey).some((f) => f.fieldKey === fieldKey);
}

module.exports = { BUILT_IN_FIELDS, getBuiltInFields, isValidBuiltInField };
