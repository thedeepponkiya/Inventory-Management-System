// Closed whitelist of every form/entity Custom Fields can attach to, mapping a stable
// `entityKey` (chosen by us, never derived from user input) to the REAL underlying table name.
// This is the one and only place a table name is ever picked for a custom-field ALTER TABLE -
// customField.service.js always looks the table up through this map, it never accepts or
// builds a table name from the request itself. Adding a new form to Custom Fields later is
// just one more entry here (plus wiring the form's own UI) - no other part of the custom-field
// pipeline needs to change.
const CUSTOM_FIELD_ENTITIES = {
  purchaseOrder: { table: 'ims_purchase_order', label: 'Purchase Order' },
  salesOrder: { table: 'ims_sales_order', label: 'Sales Order' },
  materialInward: { table: 'ims_material_inward', label: 'Material Inward' },
  invoice: { table: 'ims_invoices', label: 'Invoice' },
  inventory: { table: 'ims_inventories', label: 'Inventory' },
  bom: { table: 'ims_bom', label: 'BOM' },
  user: { table: 'users', label: 'User' },
  crmLead: { table: 'crm_leads', label: 'CRM Lead' },
  crmFollowup: { table: 'crm_followups', label: 'CRM Follow-up' },
};

function getEntityTable(entityKey) {
  return CUSTOM_FIELD_ENTITIES[entityKey]?.table ?? null;
}

module.exports = { CUSTOM_FIELD_ENTITIES, getEntityTable };
