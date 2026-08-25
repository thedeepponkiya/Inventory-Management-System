const pool = require('../config/db');

const TABLE = 'custom_field_definitions';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY "entityKey" ASC, "sortOrder" ASC, id ASC`);
  return result.rows;
}

async function getByEntity(entityKey, client = pool) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE "entityKey" = $1 ORDER BY "sortOrder" ASC, id ASC`, [entityKey]);
  return result.rows;
}

async function findById(id, client = pool) {
  const result = await client.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

// `sortOrder` defaults to "after every existing field on this entity" so a newly-added field
// lands last, not first.
async function create(fields, client = pool) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX("sortOrder"), -1) + 1 AS "nextSortOrder" FROM ${TABLE} WHERE "entityKey" = $1`,
    [fields.entityKey]
  );
  const sortOrder = rows[0].nextSortOrder;
  const result = await client.query(
    `INSERT INTO ${TABLE} ("entityKey", "columnName", label, "fieldType", options, required, active, "sortOrder", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [fields.entityKey, fields.columnName, fields.label, fields.fieldType, fields.options ? JSON.stringify(fields.options) : null, fields.required, fields.active !== false, sortOrder, fields.createdBy]
  );
  return result.rows[0];
}

// Metadata-only - label/options/required/active can change freely after creation without
// touching the real column. entityKey/columnName/fieldType are permanent once created (see
// customField.service.js's updateDefinition for why changing the underlying column is
// deliberately not supported - delete and recreate instead). Toggling `active` off hides the
// field from the real forms/tables that read it (see listDefinitionsForEntity's
// includeInactive filter) without touching the column or any data already stored in it -
// Developer Admin can still see and re-enable it later, unlike Delete which drops the column.
async function update(id, fields, client = pool) {
  const result = await client.query(
    `UPDATE ${TABLE} SET label = $1, options = $2, required = $3, active = $4, "updatedAt" = now() WHERE id = $5 RETURNING *`,
    [fields.label, fields.options ? JSON.stringify(fields.options) : null, fields.required, fields.active !== false, id]
  );
  return result.rows[0];
}

async function remove(id, client = pool) {
  await client.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, getByEntity, findById, create, update, remove };