const pool = require('../config/db');

const TABLE = 'crm_followups';

const SELECT_WITH_JOIN = `
  SELECT f.*, u."userName" AS "createdByName"
  FROM ${TABLE} f
  LEFT JOIN users u ON u.id = f."createdBy"
  LEFT JOIN crm_leads l ON l.id = f."leadId"
`;

// `assignedToUserId` scopes the result to just the follow-ups whose LEAD is assigned to that
// user - see crmPermissions.util.js's leadScopeUserId (Sales User only ever sees follow-ups
// for their own leads, mirroring getLeads' own scoping). Omitted/null for every other role.
async function getAll(leadId, assignedToUserId) {
  const conditions = [];
  const params = [];
  if (leadId) {
    params.push(leadId);
    conditions.push(`f."leadId" = $${params.length}`);
  }
  if (assignedToUserId) {
    params.push(assignedToUserId);
    conditions.push(`l."assignedTo" = $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`${SELECT_WITH_JOIN} ${where} ORDER BY f."dueAt" ASC`, params);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_JOIN} WHERE f.id = $1`, [id]);
  return result.rows[0];
}

async function create(fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("leadId", "dueAt", type, notes, "createdBy") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [fields.leadId, fields.dueAt, fields.type, fields.notes, fields.createdBy]
  );
  return findById(result.rows[0].id);
}

async function update(id, fields) {
  await pool.query(
    `UPDATE ${TABLE} SET
      "dueAt" = $1, type = $2, notes = $3, status = $4, "completedAt" = $5, "updatedAt" = now()
    WHERE id = $6`,
    [fields.dueAt, fields.type, fields.notes, fields.status, fields.completedAt, id]
  );
  return findById(id);
}

async function remove(id) {
  const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = { getAll, findById, create, update, remove };
