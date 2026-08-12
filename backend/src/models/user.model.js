const pool = require('../config/db');

const TABLE = 'users';

// Columns returned to the frontend for User Management - never includes passwordHash/token/
// tokenExpiresAt. "userName" is aliased to "fullName" since that's the internal column name
// (kept as-is so CRM's existing "userName" AS "assignedToName"/"createdByName" joins are
// untouched), but the User Management feature was speced against a "fullName" field.
const SAFE_SELECT = `
  SELECT id, "userName" AS "fullName", email, phone, "userCode", "roleId", "departmentId",
         "profileImage", status, "lastLogin", "createdBy", "createdAt", "updatedAt"
  FROM ${TABLE}
`;

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

async function updateLastLogin(id) {
  await pool.query(`UPDATE ${TABLE} SET "lastLogin" = now() WHERE id = $1`, [id]);
}

// Deliberately named getAllBasic (not getAll) and an explicit column list - never SELECT *
// here, so password/token/tokenExpiresAt can never leak. Added for CRM's Assigned-To
// dropdown (see crmUser.controller.js) - this is not the general user-management list.
// Excludes "isHidden" rows for the same reason getAll() does.
async function getAllBasic() {
  const result = await pool.query(`SELECT id, "userName", email FROM ${TABLE} WHERE "isHidden" = false ORDER BY "userName" ASC`);
  return result.rows;
}

// Excludes "isHidden" rows (e.g. a break-glass Super Admin account) from the User Management
// list - they can still log in and use the app normally, they just never show up here.
async function getAll() {
  const result = await pool.query(`${SAFE_SELECT} WHERE "isHidden" = false ORDER BY id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`${SAFE_SELECT} WHERE id = $1`, [id]);
  return result.rows[0];
}

async function getNextUserCode() {
  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING("userCode" FROM 5) AS INTEGER)), 0) AS "maxSeq" FROM ${TABLE} WHERE "userCode" ~ '^USR-[0-9]+$'`
  );
  const nextSeq = Number(result.rows[0].maxSeq) + 1;
  return `USR-${String(nextSeq).padStart(4, '0')}`;
}

async function create({ userCode, fullName, email, phone, passwordHash, roleId, departmentId, profileImage, status, createdBy }) {
  const result = await pool.query(
    `INSERT INTO ${TABLE} ("userCode", "userName", email, phone, "passwordHash", "roleId", "departmentId", "profileImage", status, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [userCode, fullName, email, phone || null, passwordHash, roleId || null, departmentId || null, profileImage || null, status, createdBy || null]
  );
  return findById(result.rows[0].id);
}

async function update(id, { fullName, email, phone, roleId, departmentId, profileImage, status }) {
  await pool.query(
    `UPDATE ${TABLE}
     SET "userName" = $1, email = $2, phone = $3, "roleId" = $4, "departmentId" = $5, "profileImage" = $6, status = $7, "updatedAt" = now()
     WHERE id = $8`,
    [fullName, email, phone || null, roleId || null, departmentId || null, profileImage || null, status, id]
  );
  return findById(id);
}

async function updatePasswordHash(id, passwordHash) {
  await pool.query(`UPDATE ${TABLE} SET "passwordHash" = $1, "updatedAt" = now() WHERE id = $2`, [passwordHash, id]);
}

async function remove(id) {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

module.exports = {
  findByEmail,
  findByToken,
  updateToken,
  updateLastLogin,
  getAllBasic,
  getAll,
  findById,
  getNextUserCode,
  create,
  update,
  updatePasswordHash,
  remove,
};
