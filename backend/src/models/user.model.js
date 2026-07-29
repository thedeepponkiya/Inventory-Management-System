const pool = require('../config/db');

const TABLE = 'users';

async function findByPhoneNumber(phoneNumber) {
  const [rows] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE phoneNumber = ?`,
    [phoneNumber]
  );
  return rows[0];
}

async function findByToken(token) {
  const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE token = ?`, [
    token,
  ]);
  return rows[0];
}

async function updateToken(id, token) {
  await pool.query(`UPDATE ${TABLE} SET token = ? WHERE id = ?`, [token, id]);
}

module.exports = { findByPhoneNumber, findByToken, updateToken };
