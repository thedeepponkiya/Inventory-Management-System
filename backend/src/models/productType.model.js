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

async function create(productType, status, description) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("productType", description, status) VALUES ($1, $2, $3) RETURNING *`,
    [productType, description, status]
  );
  return result.rows[0];
}

async function update(id, productType, status, description) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET "productType" = $1, description = $2, status = $3 WHERE id = $4 RETURNING *`,
    [productType, description, status, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByProductType, create, update, remove };
