const pool = require('../config/db');

const TABLE = 'crm_notes';

const SELECT_WITH_JOIN = `
  SELECT n.*, u."userName" AS "createdByName"
  FROM ${TABLE} n
  LEFT JOIN users u ON u.id = n."createdBy"
`;

async function getByLead(leadId) {
  const result = await pool.query(`${SELECT_WITH_JOIN} WHERE n."leadId" = $1 ORDER BY n."createdAt" DESC`, [leadId]);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SELECT_WITH_JOIN} WHERE n.id = $1`, [id]);
  return result.rows[0];
}

async function create(fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("leadId", body, "createdBy") VALUES ($1, $2, $3) RETURNING id`,
    [fields.leadId, fields.body, fields.createdBy]
  );
  return findById(result.rows[0].id);
}

async function remove(id) {
  const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = { getByLead, findById, create, remove };
