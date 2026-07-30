const pool = require('../config/db');

const TABLE = 'ims_product_type';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByProductType(productType) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER("productType") = LOWER($1)`, [productType]);
  return result.rows[0];
}

async function create(productType, status) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("productType", status) VALUES ($1, $2) RETURNING *`,
    [productType, status]
  );
  return result.rows[0];
}

async function update(id, productType, status) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET "productType" = $1, status = $2 WHERE id = $3 RETURNING *`,
    [productType, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByProductType, create, update, remove };
