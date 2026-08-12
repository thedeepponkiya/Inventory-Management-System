const pool = require('../config/db');

const TABLE = 'crm_campaigns';

const SELECT_WITH_JOIN = `
  SELECT c.*, s.name AS "sourceName"
  FROM ${TABLE} c
  LEFT JOIN crm_sources s ON s.id = c."sourceId"
`;

async function getAll() {
  const result = await pool.query(`${SELECT_WITH_JOIN} ORDER BY c."createdAt" DESC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_JOIN} WHERE c.id = $1`, [id]);
  return result.rows[0];
}

async function findByName(name) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(name) = LOWER($1)`, [name]);
  return result.rows[0];
}

async function create(fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (name, "sourceId", "startDate", "endDate", budget, status)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [fields.name, fields.sourceId, fields.startDate, fields.endDate, fields.budget, fields.status]
  );
  return findById(result.rows[0].id);
}

async function update(id, fields) {
  await pool.query(
    `UPDATE ${TABLE} SET
      name = $1, "sourceId" = $2, "startDate" = $3, "endDate" = $4, budget = $5, status = $6, "updatedAt" = now()
    WHERE id = $7`,
    [fields.name, fields.sourceId, fields.startDate, fields.endDate, fields.budget, fields.status, id]
  );
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

async function findByMetaCampaignId(metaCampaignId) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE "metaCampaignId" = $1`, [metaCampaignId]);
  return result.rows[0];
}

// Read-only mirror of a Meta ad campaign - insert on first sync, otherwise just refresh the
// fields Meta actually owns (name/metaStatus/budget/metrics). Never touches the local
// `status`/dates a user may have edited by hand after the initial sync, aside from `status`
// itself which metaSync.service.js derives fresh from Meta's status each time (Meta is the
// source of truth for whether the campaign is actually running).
async function upsertFromMeta(fields) {
  const existing = await findByMetaCampaignId(fields.metaCampaignId);
  if (existing) {
    await pool.query(
      `UPDATE ${TABLE} SET
        name = $1, status = $2, "metaStatus" = $3, budget = $4, spend = $5, impressions = $6, clicks = $7,
        "lastSyncedAt" = now(), "updatedAt" = now()
      WHERE id = $8`,
      [fields.name, fields.status, fields.metaStatus, fields.budget, fields.spend, fields.impressions, fields.clicks, existing.id]
    );
    return findById(existing.id);
  }

  const result = await pool.query(
    `INSERT INTO ${TABLE} (name, "sourceId", budget, status, "metaCampaignId", "metaStatus", spend, impressions, clicks, "lastSyncedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING id`,
    [fields.name, fields.sourceId, fields.budget, fields.status, fields.metaCampaignId, fields.metaStatus, fields.spend, fields.impressions, fields.clicks]
  );
  return findById(result.rows[0].id);
}

module.exports = { getAll, findById, findByName, findByMetaCampaignId, create, update, remove, upsertFromMeta };
