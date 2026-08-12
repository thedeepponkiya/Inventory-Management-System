const pool = require('../config/db');

const TAGS_TABLE = 'crm_tags';
const LEAD_TAGS_TABLE = 'crm_lead_tags';

async function getByLead(leadId) {
  const result = await pool.query(
    `SELECT t.* FROM ${TAGS_TABLE} t
     JOIN ${LEAD_TAGS_TABLE} lt ON lt."tagId" = t.id
     WHERE lt."leadId" = $1
     ORDER BY t.name ASC`,
    [leadId]
  );
  return result.rows;
}

async function findByName(name) {
  const result = await pool.query(`SELECT * FROM ${TAGS_TABLE} WHERE LOWER(name) = LOWER($1)`, [name]);
  return result.rows[0];
}

async function create(name) {
  const result = await pool.query(`INSERT INTO ${TAGS_TABLE} (name) VALUES ($1) RETURNING *`, [name]);
  return result.rows[0];
}

async function findOrCreateByName(name) {
  const existing = await findByName(name);
  if (existing) return existing;
  return create(name);
}

async function attachToLead(leadId, tagId) {
  await pool.query(
    `INSERT INTO ${LEAD_TAGS_TABLE} ("leadId", "tagId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [leadId, tagId]
  );
}

async function detachFromLead(leadId, tagId) {
  await pool.query(`DELETE FROM ${LEAD_TAGS_TABLE} WHERE "leadId" = $1 AND "tagId" = $2`, [leadId, tagId]);
}

module.exports = { getByLead, findByName, create, findOrCreateByName, attachToLead, detachFromLead };
