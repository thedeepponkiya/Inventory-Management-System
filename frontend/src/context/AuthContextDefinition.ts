import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from AuthContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook below) alongside a component
// breaks React Fast Refresh, forcing a full page reload on every edit instead of a hot swap.
export interface AuthUser {
    userName: string;
    email: string;
}

export interface LoginResult {
    success: boolean;
    message: string;
}

export interface AuthContextValue {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthContext must be used within an AuthContextProvider');
    return ctx;
}
