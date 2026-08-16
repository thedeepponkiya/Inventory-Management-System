import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from AccentColorContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook/loader below) alongside a
// component breaks React Fast Refresh, forcing a full page reload on every edit instead
// of a hot swap.
export const ACCENT_COLORS = [
    { key: 'blue', label: 'Blue', color: '#2563eb' },
    { key: 'teal', label: 'Teal', color: '#0d9488' },
    { key: 'purple', label: 'Purple', color: '#9333ea' },
    { key: 'red', label: 'Red', color: '#dc2626' },
    { key: 'amber', label: 'Amber', color: '#d97706' },
    { key: 'green', label: 'Green', color: '#16a34a' },
] as const;

export type AccentColorKey = (typeof ACCENT_COLORS)[number]['key'];

const STORAGE_KEY = 'inventory-app:accent-color';

export interface AccentColorContextValue {
    accentColor: AccentColorKey;
    accentColorHex: string;
    setAccentColor: (key: AccentColorKey) => void;
}

export function getAccentHex(key: AccentColorKey): string {
    return ACCENT_COLORS.find((option) => option.key === key)?.color ?? ACCENT_COLORS[0].color;
}

// 'blue' (#2563eb) is the app's original hardcoded brand color - defaulting to it here means
// nothing visually changes for any user until they actively pick a different swatch in
// Settings. Also called directly by main.tsx (outside the React tree) to set --accent-primary
// before first paint, same as loadThemeFromStorage does for the dark/light theme.
export function loadAccentColorFromStorage(): AccentColorKey {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ACCENT_COLORS.some((option) => option.key === stored)) return stored as AccentColorKey;
    } catch {
        // Storage unavailable (e.g. private browsing) - falls through to the default below.
    }
    return 'blue';
}

export const AccentColorContext = createContext<AccentColorContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useAccentColorContext(): AccentColorContextValue {
    const ctx = useContext(AccentColorContext);
    if (!ctx) throw new Error('useAccentColorContext must be used within an AccentColorContextProvider');
    return ctx;
}
