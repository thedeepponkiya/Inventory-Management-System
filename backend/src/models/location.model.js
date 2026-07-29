const pool = require('../config/db');

const TABLE = 'ims_location';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByLocation(location) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER(location) = LOWER($1)`, [location]);
  return result.rows[0];
}

async function create(location, status) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} (location, status) VALUES ($1, $2) RETURNING *`,
    [location, status]
  );
  return result.rows[0];
}

async function update(id, location, status) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET location = $1, status = $2 WHERE id = $3 RETURNING *`,
    [location, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByLocation, create, update, remove };
