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

// Deliberately named getAllBasic (not getAll) and an explicit column list - never SELECT *
// here, so password/token/tokenExpiresAt can never leak. Added for CRM's Assigned-To
// dropdown (see crmUser.controller.js) - this is not a general user-management list.
async function getAllBasic() {
  const result = await pool.query(`SELECT id, "userName", email FROM ${TABLE} ORDER BY "userName" ASC`);
  return result.rows;
}

module.exports = { findByEmail, findByToken, updateToken, getAllBasic };
