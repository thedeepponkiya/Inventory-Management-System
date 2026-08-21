const pool = require('../config/db');

const TABLE = 'ims_sales_order_dispatches';

// One row per dispatchSalesOrder call (see salesOrder.controller.js). Accepts an optional
// `client` so the controller can insert this inside the same transaction as the SO's
// items/status update and the Inventory stock adjustment.
async function create(fields, client = pool) {
  const result = await client.query(
    `INSERT INTO ${TABLE} ("soId", "dispatchDate", items, "dispatchedBy")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [fields.soId, fields.dispatchDate, JSON.stringify(fields.items), fields.dispatchedBy]
  );
  return result.rows[0];
}

// Used by salesOrder.controller.js's revertDispatch - a full revert undoes EVERY shipment
// made so far on this order (see that function's own comment), so the dispatch history rows
// recording those now-undone shipments are removed too rather than being left behind to look
// like stale duplicates once the order is dispatched again.
async function removeAllForSo(soId, client = pool) {
  await client.query(`DELETE FROM ${TABLE} WHERE "soId" = $1`, [soId]);
}

module.exports = { create, removeAllForSo };
