const pool = require('../config/db');

const TABLE = 'users';

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM ${TABLE} WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

async function findByToken(token) {
  const result = await pool.query(
    `SELECT * FROM ${TABLE} WHERE token = $1 AND "tokenExpiresAt" > now()`,
    [token]
  );
  return result.rows[0];
}

async function updateToken(id, token, expiresAt) {
  await pool.query(
    `UPDATE ${TABLE} SET token = $1, "tokenExpiresAt" = $2 WHERE id = $3`,
    [token, expiresAt, id]
  );
}

module.exports = { findByEmail, findByToken, updateToken };
