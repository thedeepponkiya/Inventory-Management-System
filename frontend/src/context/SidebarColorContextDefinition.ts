import { createContext, useContext } from 'react';
import { DEFAULT_DATA_TYPE_VALUE } from '../common/constants/commonConstant';

// Split out from SidebarColorContext.tsx so that file can export only the Provider component -
// exporting non-components (this context object, the hook/loader below) alongside a
// component breaks React Fast Refresh, forcing a full page reload on every edit instead
// of a hot swap.
//
// Every preset also carries `isLight` - the sidebar's own text/icon colors (white, #8b93ab
// etc., see SideBarNavigation.css) are hardcoded for a dark background, so every light option
// shares one parallel light-mode CSS block (gated on the data-sidebar-theme="light" attribute
// this context sets on <html> - see SidebarColorContext.tsx) rather than just working for free
// like the dark presets do. That block only swaps text/border/hover colors, not the
// background itself, so any light-enough hex can be added here without further CSS changes.
export const SIDEBAR_COLORS = [
    { key: 'navy', label: 'Navy', color: '#0f1b3d', isLight: false },
    { key: 'charcoal', label: 'Charcoal', color: '#1e293b', isLight: false },
    { key: 'slate', label: 'Slate', color: '#111827', isLight: false },
    { key: 'maroon', label: 'Maroon', color: '#450a0a', isLight: false },
    { key: 'black', label: 'Black', color: '#0a0a0a', isLight: false },
    { key: 'white', label: 'Light', color: '#f8fafc', isLight: true },
    { key: 'lightGray', label: 'Light Gray', color: '#e2e8f0', isLight: true },
] as const;

export type SidebarColorKey = (typeof SIDEBAR_COLORS)[number]['key'];

const STORAGE_KEY = 'inventory-app:sidebar-color';

export interface SidebarColorContextValue {
    sidebarColor: SidebarColorKey;
    sidebarColorHex: string;
    setSidebarColor: (key: SidebarColorKey) => void;
}

export function getSidebarColorHex(key: SidebarColorKey): string {
    return SIDEBAR_COLORS.find((option) => option.key === key)?.color ?? SIDEBAR_COLORS[0].color;
}

export function isSidebarColorLight(key: SidebarColorKey): boolean {
    return SIDEBAR_COLORS.find((option) => option.key === key)?.isLight ?? false;
}

// 'navy' (#0f1b3d) is the app's original hardcoded sidebar color - defaulting to it here means
// nothing visually changes for any user until they actively pick a different swatch. Also
// called directly by main.tsx (outside the React tree) to set --sidebar-bg before first paint,
// same as loadAccentColorFromStorage does for the accent color.
export function loadSidebarColorFromStorage(): SidebarColorKey {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SIDEBAR_COLORS.some((option) => option.key === stored)) return stored as SidebarColorKey;
    } catch {
        // Storage unavailable (e.g. private browsing) - falls through to the default below.
    }
    return 'navy';
}

export const SidebarColorContext = createContext<SidebarColorContextValue | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

export function useSidebarColorContext(): SidebarColorContextValue {
    const ctx = useContext(SidebarColorContext);
    if (!ctx) throw new Error('useSidebarColorContext must be used within a SidebarColorContextProvider');
    return ctx;
}
