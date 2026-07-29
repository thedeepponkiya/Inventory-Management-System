const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, logout } = require('../controllers/auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: false,
    message: 'Too many login attempts, please try again later',
    data: null,
  },
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);

module.exports = router;
