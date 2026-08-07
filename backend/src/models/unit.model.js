const pool = require('../config/db');

const TABLE = 'ims_unit';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByUnit(unit) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(unit) = LOWER($1)`, [unit]);
  return result.rows[0];
}

async function create(unit, status) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (unit, status) VALUES ($1, $2) RETURNING *`,
    [unit, status]
  );
  return result.rows[0];
}

async function update(id, unit, status) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET unit = $1, status = $2 WHERE id = $3 RETURNING *`,
    [unit, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByUnit, create, update, remove };
