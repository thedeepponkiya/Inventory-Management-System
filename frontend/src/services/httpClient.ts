// Mirrors AuthContext.tsx's own storage shape/key - kept as a plain constant (not a shared
// import) since AuthContext only ever reads this at module-load time for its own initial
// state, and duplicating the key string here avoids a circular import between the auth
// context and every services/*.ts file that now needs to attach the token.
const STORAGE_KEY = 'inventory-app:auth';

// Also duplicated (not shared-imported, same circular-import reasoning as STORAGE_KEY) in
// crmAxiosClient.ts. AuthContext.tsx listens for this on window to clear its session the
// moment ANY request comes back 401 - see the comment on the 401 branch below for why this
// exists at all.
const SESSION_EXPIRED_EVENT = 'inventory-app:session-expired';

function getStoredToken(): string | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return (JSON.parse(raw) as { token?: string }).token ?? null;
    } catch {
        return null;
    }
}

// Drop-in replacement for the native fetch() used by every services/*.ts file - attaches the
// logged-in user's session token as a Bearer Authorization header. The backend now actually
// enforces this on every route except /auth/* (see backend/src/middleware/auth.middleware.js);
// previously no request sent it at all, so the login screen was the only thing standing
// between an unauthenticated caller and the API.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getStoredToken();
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });

    // A 401 here means the stored token is gone/expired server-side (e.g. the sliding
    // 24h expiry finally lapsed from inactivity). Every services/*.ts caller already
    // catches its own fetch failures and just falls back to an empty list/loading=false,
    // so without this, an expired session silently rendered every single page as
    // permanently empty with zero indication anything was wrong - the user had to open
    // devtools to discover they'd been logged out. Clearing storage + broadcasting lets
    // AuthContext flip isAuthenticated to false, which routers.tsx already redirects to
    // /login for.
    if (response.status === 401) {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Storage unavailable - nothing to clear.
        }
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return response;
}
