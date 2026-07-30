const pool = require('../config/db');

const TABLE = 'ims_vendor';

async function getAll() {
  const result = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function findByVendorName(vendorName) {
  const result = await pool.query(`SELECT * FROM ${TABLE} WHERE LOWER("vendorName") = LOWER($1)`, [vendorName]);
  return result.rows[0];
}

async function create(vendorName, email, phoneNumber, address, city, zipCode) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("vendorName", email, "phoneNumber", address, city, "zipCode") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [vendorName, email, phoneNumber, address, city, zipCode]
  );
  return result.rows[0];
}

async function update(id, vendorName, email, phoneNumber, address, city, zipCode) {
  const result = await pool.query(
    `UPDATE ${TABLE} SET "vendorName" = $1, email = $2, "phoneNumber" = $3, address = $4, city = $5, "zipCode" = $6 WHERE id = $7 RETURNING *`,
    [vendorName, email, phoneNumber, address, city, zipCode, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = { getAll, findById, findByVendorName, create, update, remove };
