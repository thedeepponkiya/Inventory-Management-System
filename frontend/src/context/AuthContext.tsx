import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';
import { AuthContext, type AuthUser, type LoginResult } from './AuthContextDefinition';
import { API_BASE_URL } from '../services/apiConfig';

const STORAGE_KEY = 'inventory-app:auth';
// Duplicated in services/httpClient.ts and crmAxiosClient.ts (same circular-import reasoning
// as STORAGE_KEY) - dispatched there whenever any API call comes back 401, so this context
// can flip isAuthenticated to false the moment a session actually expires server-side,
// instead of every page just silently rendering empty (see httpClient.ts's authFetch).
const SESSION_EXPIRED_EVENT = 'inventory-app:session-expired';

interface StoredAuth {
    token: string;
    user: AuthUser;
}

function loadAuthFromStorage(): StoredAuth | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
        return null;
    }
}

function saveAuthToStorage(auth: StoredAuth | null): void {
    try {
        if (auth) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Storage quota exceeded or unavailable (e.g. private browsing) - the
        // session just won't survive a refresh, which is an acceptable fallback.
    }
}

const initialAuth = loadAuthFromStorage();

const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(initialAuth?.token ?? DEFAULT_DATA_TYPE_VALUE.NULL);
    const [user, setUser] = useState<AuthUser | null>(initialAuth?.user ?? DEFAULT_DATA_TYPE_VALUE.NULL);

    useEffect(() => {
        const handleSessionExpired = () => {
            setToken(DEFAULT_DATA_TYPE_VALUE.NULL);
            setUser(DEFAULT_DATA_TYPE_VALUE.NULL);
        };
        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }, []);

    const login = async (email: string, password: string): Promise<LoginResult> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const result = await response.json();
            if (!response.ok || !result.status) {
                return { success: DEFAULT_DATA_TYPE_VALUE.FALSE, message: result.message ?? 'Login failed' };
            }
            const authUser: AuthUser = {
                userName: result.data.userName,
                email: result.data.email,
                profileImage: result.data.profileImage ?? DEFAULT_DATA_TYPE_VALUE.NULL,
                isHidden: result.data.isHidden ?? DEFAULT_DATA_TYPE_VALUE.FALSE,
                roleId: result.data.roleId ?? DEFAULT_DATA_TYPE_VALUE.NULL,
            };
            setToken(result.data.token);
            setUser(authUser);
            saveAuthToStorage({ token: result.data.token, user: authUser });
            return { success: DEFAULT_DATA_TYPE_VALUE.TRUE, message: result.message };
        } catch {
            return { success: DEFAULT_DATA_TYPE_VALUE.FALSE, message: 'Unable to reach the server. Please try again.' };
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : DEFAULT_DATA_TYPE_VALUE.UNDEFINED,
            });
        } catch {
            // Best-effort - clear the local session regardless of network/server errors.
        }
        setToken(DEFAULT_DATA_TYPE_VALUE.NULL);
        setUser(DEFAULT_DATA_TYPE_VALUE.NULL);
        saveAuthToStorage(DEFAULT_DATA_TYPE_VALUE.NULL);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
export default AuthContextProvider;
