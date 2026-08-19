// Tables intentionally KEPT (never touched by reset): "users" (avoid locking everyone out,
// including the hidden Super Admin), master data (ims_location/ims_category/
// ims_product_type/ims_unit/ims_vendor/ims_customer), and settings/config-like tables
// (ims_developer_admin_settings, crm_meta_integration, crm_stages/crm_sources/crm_tags -
// these define the CRM's pipeline/lead-source/tag lookups, not day-to-day business records,
// and CRM would have nothing to attach a lead to without them).
//
// This is deliberately an OPT-OUT list, not an opt-in one. It used to be the other way around
// (a hand-maintained TABLES_TO_RESET array) and that already silently drifted out of sync
// once in practice: ims_sales_order_dispatches was added to schema.sql for the Dispatch
// History feature and nobody remembered to also add it here - it only happened to still get
// cleared because TRUNCATE ... CASCADE swept it in as a side effect of its FK to
// ims_sales_order, and the admin-facing "will be cleared" list never mentioned it. With the
// list inverted, getTablesToReset below queries the database for every table that actually
// exists and treats "not explicitly kept" as the reset target - so a brand new
// business/transactional table is reset by default the moment it's created, with no code
// change needed here. Only add a table to KEPT_TABLES when it's a lookup/master-data/settings
// table that should survive a reset - forgetting to do that now fails safe (over-cleared,
// caught immediately by whoever tests the new feature) instead of failing silent
// (under-cleared, discovered only much later, if ever).
const KEPT_TABLES = new Set([
    'users',
    'ims_location',
    'ims_category',
    'ims_product_type',
    'ims_unit',
    'ims_vendor',
    'ims_customer',
    'ims_developer_admin_settings',
    'crm_meta_integration',
    'crm_stages',
    'crm_sources',
    'crm_tags',
]);

// Reads the live table list from pg_catalog rather than trusting any file/array to be
// current - this is the one source of truth that can never fall out of sync with what's
// actually deployed on THIS database, unlike a hand-written list living in application code.
async function getTablesToReset(client) {
    const result = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    return result.rows
        .map((row) => row.tablename)
        .filter((tableName) => !KEPT_TABLES.has(tableName));
}

// RESTART IDENTITY resets serial/identity sequences back to 1, matching the requested "leave
// completely empty" (not just row-empty but also code-numbering-reset) end state. CASCADE is
// a safety net for any FK relationship between two reset tables, not the primary mechanism -
// every table that should be reset is already included explicitly via getTablesToReset above.
// Returns the resolved table list so the controller can report exactly what was cleared.
async function resetBusinessData(client) {
    const tables = await getTablesToReset(client);
    const quoted = tables.map((table) => `"${table}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    return tables;
}

module.exports = { KEPT_TABLES, getTablesToReset, resetBusinessData };
