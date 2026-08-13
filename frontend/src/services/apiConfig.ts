// Single source of truth for the backend's base URL. Derived from the page's own hostname
// (never hardcoded to "localhost") so the exact same build works whether the app is opened at
// http://localhost:5173 (same machine) or http://<lan-ip>:5173 (another device on the same
// WiFi network, e.g. a phone testing the mobile UI) - the backend is assumed to run on that
// same host, just on its own port (see backend/.env's PORT).
const API_PORT = 5000;
export const API_HOST = `http://${window.location.hostname}:${API_PORT}`;
export const API_BASE_URL = `${API_HOST}/api/v1`;
