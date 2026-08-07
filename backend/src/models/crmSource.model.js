const pool = require('../config/db');

const TABLE = 'crm_sources';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
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
    `INSERT INTO ${TABLE} (name, type, status) VALUES ($1, $2, $3) RETURNING *`,
    [fields.name, fields.type, fields.status]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET name = $1, type = $2, status = $3, "updatedAt" = now() WHERE id = $4 RETURNING *`,
    [fields.name, fields.type, fields.status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByName, create, update, remove };
