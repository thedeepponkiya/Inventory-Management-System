import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from ThemeContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook/loader below) alongside a
// component breaks React Fast Refresh, forcing a full page reload on every edit instead
// of a hot swap.
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'inventory-app:theme';

export interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

// Also called directly by main.tsx (outside the React tree) to set the initial
// PrimeReact theme link/data-theme attribute before first paint.
export function loadThemeFromStorage(): Theme {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export const ThemeContext = createContext<ThemeContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useThemeContext(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useThemeContext must be used within a ThemeContextProvider');
    return ctx;
}
