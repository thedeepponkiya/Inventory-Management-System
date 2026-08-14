import axios from 'axios';
import { API_BASE_URL } from '../../../services/apiConfig';

const crmAxiosClient = axios.create({
    baseURL: `${API_BASE_URL}/crm`,
    headers: { 'Content-Type': 'application/json' },
});

// Mirrors AuthContext.tsx's own storage shape/key (also duplicated in services/httpClient.ts
// for the same reason - avoids a circular import between the auth context and every API
// client). Attaches the logged-in user's session token, which the backend now actually
// enforces on every /api/v1 route except /auth/* (see backend's auth.middleware.js).
const AUTH_STORAGE_KEY = 'inventory-app:auth';

// Duplicated from services/httpClient.ts for the same reason as AUTH_STORAGE_KEY above -
// AuthContext.tsx listens for this on window to clear an expired session (see the 401 branch
// in the response interceptor below).
const SESSION_EXPIRED_EVENT = 'inventory-app:session-expired';

crmAxiosClient.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        const token = raw ? (JSON.parse(raw) as { token?: string }).token : null;
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }
    } catch {
        // No stored session - request goes out unauthenticated and the backend will 401 it.
    }
    return config;
});

// Backend envelope is always {status, message, data}. Axios already rejects on non-2xx, so
// this just surfaces the backend's own message (400/409/404 body) instead of axios's
// generic "Request failed with status code 4xx" text.
crmAxiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Same expired-session handling as services/httpClient.ts's authFetch - without this,
        // an expired token just silently rendered every CRM page empty with no explanation.
        if (error?.response?.status === 401) {
            try {
                localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch {
                // Storage unavailable - nothing to clear.
            }
            window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        }
        const message = error?.response?.data?.message ?? error.message ?? 'Something went wrong';
        return Promise.reject(new Error(message));
    },
);

export default crmAxiosClient;
