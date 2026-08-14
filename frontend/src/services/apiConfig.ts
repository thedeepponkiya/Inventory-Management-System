// Single source of truth for the backend's base URL - always same-origin/relative, never a
// hardcoded host:port. In dev, vite.config.ts's server.proxy forwards /api and /uploads to
// the backend on localhost:5000 (works for LAN access too, e.g. a phone on the same WiFi,
// since the browser only ever talks to the Vite dev server's own origin). In production, the
// reverse proxy (Nginx) in front of the built app does the same forwarding on one HTTPS
// origin - no separate port needs to be exposed publicly, and http(s) is whatever the page
// itself was loaded with instead of being hardcoded to http.
export const API_HOST = '';
export const API_BASE_URL = `${API_HOST}/api/v1`;
