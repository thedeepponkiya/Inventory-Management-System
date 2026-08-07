const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');

const SALT_ROUNDS = 10;

async function getUsers(req, res) {
  try {
    const users = await UserModel.getAll();
    res.json({ status: true, message: 'Users fetched successfully', data: users });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function createUser(req, res) {
  try {
    const { fullName, email, phone, password, roleId, departmentId, profileImage, status, createdBy } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ status: false, message: 'fullName, email and password are required', data: null });
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
      createdBy: createdBy || 'Admin User',
    });
    res.status(201).json({ status: true, message: 'User created successfully', data: created });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { fullName, email, phone, password, roleId, departmentId, profileImage, status } = req.body;

    const existing = await UserModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'User not found', data: null });
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

    res.json({ status: true, message: 'User updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const existing = await UserModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: 'User not found', data: null });
    }
    await UserModel.remove(id);
    res.json({ status: true, message: 'User deleted successfully', data: null });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
