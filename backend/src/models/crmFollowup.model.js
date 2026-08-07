const pool = require('../config/db');

const TABLE = 'crm_followups';

const SELECT_WITH_JOIN = `
  SELECT f.*, u."userName" AS "createdByName"
  FROM ${TABLE} f
  LEFT JOIN users u ON u.id = f."createdBy"
`;

async function getAll(leadId) {
  if (leadId) {
    const result = await pool.query(`${SELECT_WITH_JOIN} WHERE f."leadId" = $1 ORDER BY f."dueAt" ASC`, [leadId]);
    return result.rows;
  }
  const result = await pool.query(`${SELECT_WITH_JOIN} ORDER BY f."dueAt" ASC`);
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
