const pool = require('../config/db');

const TABLE = 'crm_stages';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY "sortOrder" ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByName(name) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(name) = LOWER($1)`, [name]);
  return result.rows[0];
}

async function create(fields) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (name, "sortOrder", color, "isClosed", outcome, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [fields.name, fields.sortOrder, fields.color, fields.isClosed, fields.outcome, fields.status]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET
      name = $1, "sortOrder" = $2, color = $3, "isClosed" = $4, outcome = $5, status = $6, "updatedAt" = now()
     WHERE id = $7
     RETURNING *`,
    [fields.name, fields.sortOrder, fields.color, fields.isClosed, fields.outcome, fields.status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByName, create, update, remove };
