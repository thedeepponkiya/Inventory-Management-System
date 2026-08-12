const pool = require('../config/db');

const TABLE = 'ims_developer_admin_settings';

// Generic key-value store shared by every Developer Admin section - each section reads/writes
// its own JSON blob under its own settingKey, rather than each getting its own dedicated
// table. `defaultValue` is returned as-is (never written) when no row exists yet for this key.
async function getByKey(key, defaultValue) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "settingKey" = $1`, [key]);
  if (result.rows[0]) return result.rows[0].settingValue;
  return defaultValue;
}

async function upsertByKey(key, value) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("settingKey", "settingValue")
     VALUES ($1, $2)
     ON CONFLICT ("settingKey") DO UPDATE SET "settingValue" = $2, "updatedAt" = now()
     RETURNING "settingValue"`,
    [key, JSON.stringify(value)]
  );
  return result.rows[0].settingValue;
}

module.exports = { getByKey, upsertByKey };