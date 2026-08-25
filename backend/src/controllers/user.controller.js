const { sendServerError } = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const CustomFieldService = require('../services/customField.service');

const SALT_ROUNDS = 10;

// Mirrors frontend/src/common/commonFunctions/CommonUtilities.tsx's ROLE_OPTIONS - the only
// roles the Users page's own dropdown ever offers. 'Super Admin' is deliberately NOT in this
// list (it's only ever assigned directly in the DB, for the one hidden account - see
// backend/src/db/schema.sql / the session notes on the hidden Super Admin account), so a
// direct API call setting roleId: 'Super Admin' would otherwise let ANY authenticated user
// grant themselves (or anyone) full elevated status - this app has no other RBAC, isHidden is
// the one gate that exists, so only an already-isHidden caller may assign a role outside this
// whitelist.
const VALID_ROLES = ['Admin', 'Purchase Manager', 'Warehouse Manager', 'Production Manager', 'Sales Manager', 'Sales User', 'Accounts User'];

function isRoleAssignmentAllowed(req, roleId) {
  if (!roleId) return true;
  if (VALID_ROLES.includes(roleId)) return true;
  return Boolean(req.user?.isHidden);
}

// The Users page is an Admin-only feature (see roleModules.ts's '/users' module + Role
// Access), but that was only ever enforced by the frontend hiding the page/nav item - every
// write below was reachable by ANY authenticated user via a direct API call, with no check on
// who was calling, only on which roleId value they tried to set. That let any logged-in user
// (e.g. a Sales User) call PUT /users/<their own id> with { roleId: 'Admin' } and self-promote,
// since 'Admin' passes isRoleAssignmentAllowed regardless of the caller's own role. Gating
// create/update/delete here closes that off; isHidden (the Super Admin account) always passes
// too, same as every other admin-only gate in this codebase (see databaseReset.controller.js).
function isCallerAdmin(req) {
  return Boolean(req.user?.isHidden) || req.user?.roleId === 'Admin';
}

async function getUsers(req, res) {
  try {
    const users = await UserModel.getAll();
    // UserModel.getAll() reads through the same safe explicit column list as findById (see
    // createUser/updateUser's identical merge) - never picks up new `cf_*` columns on its
    // own, so they're fetched separately and merged in here per row.
    const customFieldValuesById = await CustomFieldService.getCustomFieldValuesMap('user');
    const withCustomFields = users.map((user) => ({ ...user, ...(customFieldValuesById.get(String(user.id)) ?? {}) }));
    res.json({ status: true, message: 'Users fetched successfully', data: withCustomFields });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function createUser(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to create users', data: null });
    }
    const { fullName, email, phone, password, roleId, departmentId, profileImage, status } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ status: false, message: 'fullName, email and password are required', data: null });
    }
    if (!isRoleAssignmentAllowed(req, roleId)) {
      return res.status(403).json({ status: false, message: `roleId must be one of: ${VALID_ROLES.join(', ')}`, data: null });
    }

    const duplicate = await UserModel.findByEmail(email);
    if (duplicate) {
      return res.status(409).json({ status: false, message: 'A user with this email already exists', data: null });
    }

    const userCode = await UserModel.getNextUserCode();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const created = await UserModel.create({
      userCode,
      fullName,
      email,
      phone,
      passwordHash,
      roleId,
      departmentId,
      profileImage,
      status: status || 'Active',
      // Whoever (the admin) is actually creating this account, from the authenticated
      // session - not trusted from the request body.
      createdBy: req.user.userName,
    });
    await CustomFieldService.saveValues('user', created.id, req.body.customFields);
    const customFieldValues = await CustomFieldService.getCustomFieldValues('user', created.id);
    res.status(201).json({ status: true, message: 'User created successfully', data: { ...created, ...customFieldValues } });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function updateUser(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to update users', data: null });
    }
    const { id } = req.params;
    const { fullName, email, phone, password, roleId, departmentId, profileImage, status } = req.body;

    const existing = await UserModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'User not found', data: null });
    }
    if (!isRoleAssignmentAllowed(req, roleId)) {
      return res.status(403).json({ status: false, message: `roleId must be one of: ${VALID_ROLES.join(', ')}`, data: null });
    }

    if (email) {
      const duplicate = await UserModel.findByEmail(email);
      if (duplicate && String(duplicate.id) !== String(id)) {
        return res.status(409).json({ status: false, message: 'A user with this email already exists', data: null });
      }
    }

    const updated = await UserModel.update(id, {
      fullName: fullName ?? existing.fullName,
      email: email ?? existing.email,
      phone: phone ?? existing.phone,
      roleId: roleId ?? existing.roleId,
      departmentId: departmentId ?? existing.departmentId,
      profileImage: profileImage ?? existing.profileImage,
      status: status ?? existing.status,
    });

    // Password is only rehashed/overwritten when a new one is actually supplied - leaving it
    // blank on edit keeps the existing hash untouched.
    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await UserModel.updatePasswordHash(id, passwordHash);
    }

    await CustomFieldService.saveValues('user', id, req.body.customFields);
    const customFieldValues = await CustomFieldService.getCustomFieldValues('user', id);
    res.json({ status: true, message: 'User updated successfully', data: { ...updated, ...customFieldValues } });
  } catch (err) {
    sendServerError(res, err);
  }
}

async function deleteUser(req, res) {
  try {
    if (!isCallerAdmin(req)) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete users', data: null });
    }
    const { id } = req.params;
    const existing = await UserModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'User not found', data: null });
    }
    // Two lockout guards, since this app has no other way to recover from either: deleting
    // your own account mid-session, or a regular user deleting the one hidden Super Admin
    // account (only that account itself, i.e. already isHidden, may delete it).
    if (String(existing.id) === String(req.user?.id)) {
      return res.status(400).json({ status: false, message: 'You cannot delete your own account', data: null });
    }
    // findById's SAFE_SELECT deliberately omits isHidden, so it's looked up separately here.
    if ((await UserModel.isUserHidden(id)) && !req.user?.isHidden) {
      return res.status(403).json({ status: false, message: 'Not authorized to delete this account', data: null });
    }
    await UserModel.remove(id);
    res.json({ status: true, message: 'User deleted successfully', data: null });
  } catch (err) {
    sendServerError(res, err);
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
