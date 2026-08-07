const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'email and password are required',
        data: null,
      });
    }

    const user = await UserModel.findByEmail(email);
    const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !passwordMatches) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password',
        data: null,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await UserModel.updateToken(user.id, token, expiresAt);
    await UserModel.updateLastLogin(user.id);

    res.json({
      status: true,
      message: 'Login successful',
      data: {
        userName: user.userName,
        email: user.email,
        token,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

async function logout(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (token) {
      const user = await UserModel.findByToken(token);
      if (user) {
        await UserModel.updateToken(user.id, null, null);
      }
    }

    res.json({
      status: true,
      message: 'Logout successful',
      data: null,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { login, logout };
