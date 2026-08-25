const pool = require('../config/db');
const { createDatabaseBackup } = require('../utils/databaseBackup.util');
const { getEntityTable } = require('../utils/customFieldEntities.util');
const { isValidFieldType, sqlTypeFor, coerceValue } = require('../utils/customFieldTypes.util');
const { getBuiltInFields, isValidBuiltInField } = require('../utils/builtInFields.util');
const CustomFieldDefinitionModel = require('../models/customFieldDefinition.model');
const FieldLabelOverrideModel = require('../models/fieldLabelOverride.model');

const DELETE_CONFIRM_PHRASE = 'DELETE FIELD';
// Postgres identifiers are capped at 63 bytes - "cf_" (3) leaves 60 for the derived part, kept
// well under that so a long label never gets silently truncated mid-word.
const MAX_COLUMN_NAME_LENGTH = 50;

class CustomFieldError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Turns a free-typed label into a safe camelCase Postgres identifier, prefixed "cf_" so a
// custom column can never collide with a real schema column (schema.sql never uses that
// prefix) and is always visually obvious as admin-defined, not part of the base app. This is
// the ONLY place a column name is ever derived from user input - customField.service.js never
// interpolates anything else into an ALTER TABLE statement.
function deriveColumnName(label) {
  const words = String(label).trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (words.length === 0) {
    throw new CustomFieldError('Label must contain at least one letter or number');
  }
  const camel = words
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('')
    .slice(0, MAX_COLUMN_NAME_LENGTH);
  // camel is guaranteed alphanumeric-only by construction (split already stripped every other
  // character) - re-validated here anyway as a hard backstop before this ever reaches SQL.
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(camel)) {
    throw new CustomFieldError('Label must start with a letter and contain only letters/numbers/spaces');
  }
  return `cf_${camel}`;
}

async function assertColumnAvailable(table, columnName, client) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, columnName]
  );
  if (result.rows.length > 0) {
    throw new CustomFieldError(`A column named "${columnName}" already exists on this form - choose a different label`);
  }
}

function assertValidEntity(entityKey) {
  const table = getEntityTable(entityKey);
  if (!table) {
    throw new CustomFieldError(`Unknown form "${entityKey}"`);
  }
  return table;
}

function assertValidFieldType(fieldType) {
  if (!isValidFieldType(fieldType)) {
    throw new CustomFieldError(`Unknown field type "${fieldType}"`);
  }
}

async function listAllDefinitions() {
  return CustomFieldDefinitionModel.getAll();
}

// `includeInactive` defaults to false so the real forms/tables that consult this (BOM's
// useCustomFieldColumns/CustomFieldsSection, and every entity that follows the same pattern)
// only ever see fields Developer Admin has left switched on - an inactive field's column and
// data stay untouched, it just stops appearing anywhere outside the admin panel itself, which
// explicitly asks for both (see CustomFieldsPanel.tsx).
async function listDefinitionsForEntity(entityKey, { includeInactive = false } = {}) {
  assertValidEntity(entityKey);
  const definitions = await CustomFieldDefinitionModel.getByEntity(entityKey);
  return includeInactive ? definitions : definitions.filter((d) => d.active);
}

// The one place that actually runs DDL. `ADD COLUMN IF NOT EXISTS` is a second safety net (on
// top of assertColumnAvailable's own check) matching this codebase's existing idempotent
// migration style (schema.sql), not the primary guard.
async function createDefinition({ entityKey, label, fieldType, options, required, active, createdBy }) {
  const table = assertValidEntity(entityKey);
  assertValidFieldType(fieldType);
  if (!label || !String(label).trim()) {
    throw new CustomFieldError('Label is required');
  }
  if (fieldType === 'dropdown' && (!Array.isArray(options) || options.length === 0)) {
    throw new CustomFieldError('Dropdown fields need at least one option');
  }

  const columnName = deriveColumnName(label);
  const sqlType = sqlTypeFor(fieldType);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertColumnAvailable(table, columnName, client);
    // sqlType comes only from customFieldTypes.util.js's fixed whitelist (never user input),
    // and table/columnName have already been validated above - this is the one legitimate
    // dynamic-identifier SQL statement in the whole custom-fields feature.
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${columnName}" ${sqlType}`);
    const created = await CustomFieldDefinitionModel.create(
      { entityKey, columnName, label: label.trim(), fieldType, options: fieldType === 'dropdown' ? options : null, required: Boolean(required), active: active !== false, createdBy },
      client
    );
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Label/options/required only - the physical column (name, type) is permanent once created.
// A genuine type change needs delete + recreate (see deleteDefinition), which is deliberate:
// silently ALTERing an existing column's type risks truncating or rejecting data that's
// already been entered against the old type.
async function updateDefinition(id, { label, options, required, active }) {
  const existing = await CustomFieldDefinitionModel.findById(id);
  if (!existing) {
    throw new CustomFieldError('Custom field not found', 404);
  }
  if (!label || !String(label).trim()) {
    throw new CustomFieldError('Label is required');
  }
  if (existing.fieldType === 'dropdown' && (!Array.isArray(options) || options.length === 0)) {
    throw new CustomFieldError('Dropdown fields need at least one option');
  }
  return CustomFieldDefinitionModel.update(id, {
    label: label.trim(),
    options: existing.fieldType === 'dropdown' ? options : null,
    required: Boolean(required),
    active: active !== false,
  });
}

// Permanently drops the real column, so - same double gate as databaseReset.controller.js /
// databaseUpdate.controller.js - requires a typed confirm phrase, and backs up the whole
// database first (same helper, same "abort entirely if the backup itself fails" behavior) so
// this is never truly unrecoverable even though there's no "undo" button anywhere in the app.
async function deleteDefinition(id, confirmPhrase) {
  const existing = await CustomFieldDefinitionModel.findById(id);
  if (!existing) {
    throw new CustomFieldError('Custom field not found', 404);
  }
  if (confirmPhrase !== DELETE_CONFIRM_PHRASE) {
    throw new CustomFieldError(`Type "${DELETE_CONFIRM_PHRASE}" to confirm deleting this field`);
  }

  const table = assertValidEntity(existing.entityKey);
  const backup = await createDatabaseBackup();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "${existing.columnName}"`);
    await CustomFieldDefinitionModel.remove(id, client);
    await client.query('COMMIT');
    return { backupFile: backup.fileName };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Generic save hook any entity controller can call after its own create/update: given the
// entity's row id and a { columnName: rawValue } map (built by the frontend's
// CustomFieldsSection from the same definitions this reads), writes only the columns that are
// currently real defined fields for this entity - any unknown key is silently ignored rather
// than ever reaching SQL, so a stale/tampered payload can't be used to write to an arbitrary
// column. No-ops (and skips the UPDATE entirely) when there are no custom fields defined yet
// for this entity or nothing in `values` matches one.
async function saveValues(entityKey, rowId, values, client = pool) {
  if (!values || typeof values !== 'object') return;
  const table = assertValidEntity(entityKey);
  const definitions = (await CustomFieldDefinitionModel.getByEntity(entityKey, client)).filter((d) => d.active);
  if (definitions.length === 0) return;

  const setClauses = [];
  const params = [];
  for (const def of definitions) {
    if (!Object.prototype.hasOwnProperty.call(values, def.columnName)) continue;
    params.push(coerceValue(def.fieldType, values[def.columnName]));
    setClauses.push(`"${def.columnName}" = $${params.length}`);
  }
  if (setClauses.length === 0) return;

  params.push(rowId);
  await client.query(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${params.length}`, params);
}

// Companion to saveValues, for entity controllers whose own model does NOT re-fetch via a
// plain `SELECT *` (user.model.js's SAFE_SELECT is the one case today - it's an explicit
// column list that deliberately excludes passwordHash/isHidden, so it never picks up new
// `cf_*` columns on its own). Selects only the currently-active custom field columns
// (never anything else on the row) and returns them flat, same shape saveValues' own
// `values` map expects and what a `SELECT *`-based normalize would extract - safe to merge
// onto whatever the model's own safe row already returned.
async function getCustomFieldValues(entityKey, rowId, client = pool) {
  const table = assertValidEntity(entityKey);
  const definitions = (await CustomFieldDefinitionModel.getByEntity(entityKey, client)).filter((d) => d.active);
  if (definitions.length === 0) return {};

  const columns = definitions.map((d) => `"${d.columnName}"`).join(', ');
  const result = await client.query(`SELECT ${columns} FROM ${table} WHERE id = $1`, [rowId]);
  return result.rows[0] ?? {};
}

// List-view counterpart to getCustomFieldValues - user.controller.js's getUsers renders its
// own list through UserModel.getAll() (the same safe-column-list SAFE_SELECT), so every row
// needs its `cf_*` values merged in the same way a single row does after create/update.
// Returns a Map keyed by row id (as a string, matching how ids come back from `pg`) so the
// caller can merge by `String(row.id)` without a second per-row query.
async function getCustomFieldValuesMap(entityKey, client = pool) {
  const table = assertValidEntity(entityKey);
  const definitions = (await CustomFieldDefinitionModel.getByEntity(entityKey, client)).filter((d) => d.active);
  if (definitions.length === 0) return new Map();

  const columns = definitions.map((d) => `"${d.columnName}"`).join(', ');
  const result = await client.query(`SELECT id, ${columns} FROM ${table}`);
  return new Map(result.rows.map((row) => [String(row.id), row]));
}

// Every built-in field for this entity (see builtInFields.util.js), each carrying whatever
// label it currently shows - the override's saved label if one exists, otherwise the
// hardcoded default. `isOverridden` lets the panel show a "Reset" action only where there's
// actually something to reset.
async function listBuiltInFields(entityKey) {
  assertValidEntity(entityKey);
  const fields = getBuiltInFields(entityKey);
  const overrides = await FieldLabelOverrideModel.getByEntity(entityKey);
  const overrideMap = new Map(overrides.map((o) => [o.fieldKey, o.label]));
  return fields.map((f) => ({
    entityKey,
    fieldKey: f.fieldKey,
    defaultLabel: f.defaultLabel,
    label: overrideMap.get(f.fieldKey) ?? f.defaultLabel,
    isOverridden: overrideMap.has(f.fieldKey),
  }));
}

// Renames how an existing, built-in field is displayed - never touches the real column, never
// runs DDL, so (unlike deleteDefinition) there's no confirm-phrase/backup step: this can only
// ever change display text, nothing here can lose data.
async function setLabelOverride(entityKey, fieldKey, label, updatedBy) {
  assertValidEntity(entityKey);
  if (!isValidBuiltInField(entityKey, fieldKey)) {
    throw new CustomFieldError(`"${fieldKey}" is not a known field on this form`);
  }
  if (!label || !String(label).trim()) {
    throw new CustomFieldError('Label is required');
  }
  return FieldLabelOverrideModel.upsert(entityKey, fieldKey, label.trim(), updatedBy);
}

async function resetLabelOverride(entityKey, fieldKey) {
  assertValidEntity(entityKey);
  if (!isValidBuiltInField(entityKey, fieldKey)) {
    throw new CustomFieldError(`"${fieldKey}" is not a known field on this form`);
  }
  await FieldLabelOverrideModel.remove(entityKey, fieldKey);
}

module.exports = {
  CustomFieldError,
  listAllDefinitions,
  listDefinitionsForEntity,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  saveValues,
  getCustomFieldValues,
  getCustomFieldValuesMap,
  listBuiltInFields,
  setLabelOverride,
  resetLabelOverride,
  DELETE_CONFIRM_PHRASE,
};
