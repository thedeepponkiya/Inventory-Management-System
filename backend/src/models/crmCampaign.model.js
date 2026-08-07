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

module.exports = { getAll, findById, findByName, create, update, remove };
