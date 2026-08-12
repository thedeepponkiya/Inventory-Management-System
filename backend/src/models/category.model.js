const pool = require('../config/db');

const TABLE = 'ims_category';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByCategory(category) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(category) = LOWER($1)`, [category]);
  return result.rows[0];
}

async function create(category, status, description) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (category, description, status) VALUES ($1, $2, $3) RETURNING *`,
    [category, description, status]
  );
  return result.rows[0];
}

async function update(id, category, status, description) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET category = $1, description = $2, status = $3 WHERE id = $4 RETURNING *`,
    [category, description, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByCategory, create, update, remove };
