// Shared by auth.controller.js (sets this on login) and auth.middleware.js (slides this
// forward on every authenticated request - see requireAuth's sliding-expiration comment).
// 24h: a full workday of intermittent use never forces a re-login; only being away longer
// than that (e.g. over a weekend) does.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

module.exports = { TOKEN_TTL_MS };
