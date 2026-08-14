// Single source of truth for the backend's base URL - always same-origin/relative, never a
// hardcoded host:port. In dev, vite.config.ts's server.proxy forwards /api and /uploads to
// the backend on localhost:5000 (works for LAN access too, e.g. a phone on the same WiFi,
// since the browser only ever talks to the Vite dev server's own origin).
//
// In production (https://ims.evasoftek.com), the backend is a CyberPanel "Node.js App"
// mounted at /backend rather than proxied at the domain root - CyberPanel/OpenLiteSpeed only
// routes requests under that path to the Node app in the first place (app.js's own
// /backend-prefix-stripping middleware handles it once the request arrives, but the prefix
// still has to be in the URL for OpenLiteSpeed to route it there at all). A plain Nginx
// reverse-proxy deployment wouldn't need this prefix - only adjust it here if the hosting
// setup changes.
export const API_HOST = import.meta.env.PROD ? '/backend' : '';
export const API_BASE_URL = `${API_HOST}/api/v1`;
