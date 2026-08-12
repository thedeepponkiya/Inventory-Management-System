const UserModel = require('../models/user.model');
const { TOKEN_TTL_MS } = require('../config/authConfig');

// Enforces that every request carries a valid, unexpired session token (see
// auth.controller.js's login, which issues it, and user.model.js's findByToken, which was
// previously only ever called from logout - meaning no route actually checked it before this).
// Mounted in app.js on '/api/v1' AFTER '/api/v1/auth' is mounted, so login/logout themselves
// are unaffected (Express already finished handling those requests by the time this runs).
//
// Sliding expiration: every successful check pushes tokenExpiresAt another TOKEN_TTL_MS into
// the future, so a user who's actively using the app never hits a timeout mid-session - only
// being idle for a full TOKEN_TTL_MS stretch (e.g. away overnight) actually expires the
// token. Refreshing on every request (rather than only near-expiry) keeps this simple; at
// this app's scale the extra UPDATE per request isn't worth optimizing away.
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return res.status(401).json({ status: false, message: 'Not authenticated - please log in', data: null });
    }

    const user = await UserModel.findByToken(token);
    if (!user) {
      return res.status(401).json({ status: false, message: 'Session expired - please log in again', data: null });
    }
    await UserModel.updateToken(user.id, token, new Date(Date.now() + TOKEN_TTL_MS));

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ status: false, message: err.message, data: null });
  }
}

module.exports = { requireAuth };