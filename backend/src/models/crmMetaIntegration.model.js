const pool = require('../config/db');

const TABLE = 'crm_meta_integration';

// One row in practice - always operate on the most recently created connection.
async function getConnection() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY "createdAt" DESC LIMIT 1`);
  return result.rows[0];
}

async function upsertConnection(fields) {
  await pool.query(`DELETE FROM ${TABLE}`);
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("pageId", "pageName", "pageAccessTokenEnc", "adAccountId", "adAccountName", "tokenExpiresAt", "connectedBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [fields.pageId, fields.pageName, fields.pageAccessTokenEnc, fields.adAccountId, fields.adAccountName, fields.tokenExpiresAt, fields.connectedBy]
  );
  return result.rows[0];
}

async function updateLastLeadSync(id) {
  await pool.query(`UPDATE ${TABLE} SET "lastLeadSyncAt" = now() WHERE id = $1`, [id]);
}

async function updateLastCampaignSync(id) {
  await pool.query(`UPDATE ${TABLE} SET "lastCampaignSyncAt" = now() WHERE id = $1`, [id]);
}

async function disconnect() {
  await pool.query(`DELETE FROM ${TABLE}`);
}

module.exports = { getConnection, upsertConnection, updateLastLeadSync, updateLastCampaignSync, disconnect };
