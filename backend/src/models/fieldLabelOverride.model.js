const pool = require('../config/db');

const TABLE = 'field_label_overrides';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY "entityKey" ASC, "fieldKey" ASC`);
  return result.rows;
}

async function getByEntity(entityKey) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "entityKey" = $1`, [entityKey]);
  return result.rows;
}

// One row per (entityKey, fieldKey) - re-saving an already-overridden field just replaces its
// label rather than creating a second row (see the unique index in schema.sql).
async function upsert(entityKey, fieldKey, label, updatedBy) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("entityKey", "fieldKey", label, "updatedBy")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("entityKey", "fieldKey") DO UPDATE SET label = $3, "updatedBy" = $4, "updatedAt" = now()
     RETURNING *`,
    [entityKey, fieldKey, label, updatedBy]
  );
  return result.rows[0];
}

// Reverts to the built-in default label - there's no separate "default" state to store, the
// default is just whatever builtInFields.util.js already says, so removing the override row
// entirely achieves that.
async function remove(entityKey, fieldKey) {
  await pool.query(`DELETE FROM ${TABLE} WHERE "entityKey" = $1 AND "fieldKey" = $2`, [entityKey, fieldKey]);
}

module.exports = { getAll, getByEntity, upsert, remove };
