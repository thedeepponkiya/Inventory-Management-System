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

async function create(category, status) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (category, status) VALUES ($1, $2) RETURNING *`,
    [category, status]
  );
  return result.rows[0];
}

async function update(id, category, status) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET category = $1, status = $2 WHERE id = $3 RETURNING *`,
    [category, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByCategory, create, update, remove };
