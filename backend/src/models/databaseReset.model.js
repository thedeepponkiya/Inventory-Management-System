// Business/transactional tables only. Intentionally EXCLUDED (never truncated): "users"
// (avoid locking everyone out, including the hidden Super Admin), master data
// (ims_location/ims_category/ims_product_type/ims_unit/ims_vendor/ims_customer), and
// settings/config-like tables (ims_developer_admin_settings, crm_meta_integration,
// crm_stages/crm_sources/crm_tags - these define the CRM's pipeline/lead-source/tag lookups,
// not day-to-day business records, and CRM would have nothing to attach a lead to without
// them). Listed children before parents for readability, though a single multi-table
// TRUNCATE ... CASCADE below makes the order irrelevant in practice.
const TABLES_TO_RESET = [
    'ims_purchase_order_payments',
    'ims_sales_order_payments',
    'ims_material_inward',
    'ims_invoices',
    'ims_purchase_order',
    'ims_sales_order',
    'ims_bom',
    'ims_inventories',
    'ims_raw_sku',
    'crm_notifications',
    'crm_lead_tags',
    'crm_activities',
    'crm_notes',
    'crm_followups',
    'crm_leads',
    'crm_campaigns',
];

// RESTART IDENTITY resets serial/identity sequences back to 1, matching the requested "leave
// completely empty" (not just row-empty but also code-numbering-reset) end state. CASCADE is
// a safety net for any FK not already covered by the explicit list above, not the primary
// mechanism - every table with an ON DELETE CASCADE child is already listed alongside it.
async function resetBusinessData(client) {
    const quoted = TABLES_TO_RESET.map((table) => `"${table}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}

module.exports = { TABLES_TO_RESET, resetBusinessData };
