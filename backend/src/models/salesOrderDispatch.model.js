const pool = require('../config/db');

const TABLE = 'ims_sales_order_dispatches';

// One row per dispatchSalesOrder call (see salesOrder.controller.js) - unlike
// salesOrderPayment.model.js this has no update/remove: the ledger is append-only, so
// "Revert Dispatch" (a separate full-reset action) never deletes history rows here. Accepts
// an optional `client` so the controller can insert this inside the same transaction as the
// SO's items/status update and the Inventory stock adjustment.
async function create(fields, client = pool) {
  const result = await client.query(
    `INSERT INTO ${TABLE} ("soId", "dispatchDate", items, "dispatchedBy")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [fields.soId, fields.dispatchDate, JSON.stringify(fields.items), fields.dispatchedBy]
  );
  return result.rows[0];
}

module.exports = { create };
