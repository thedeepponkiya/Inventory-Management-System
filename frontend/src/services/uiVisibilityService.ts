import { authFetch } from './httpClient';
const API_BASE_URL = 'http://localhost:5000/api/v1';
const SETTING_KEY = 'ui-visibility';

// Controls which Quick Action buttons (FilterBar.tsx) and sidebar menu items
// (SideBarNavigation.tsx) are shown app-wide - deliberately excludes CRM's own Quick
// Actions/menu. Backed by the generic Developer Admin settings store
// (ims_developer_admin_settings, keyed 'ui-visibility'), not localStorage, so it's centrally
// controlled and applies to every user/browser/deployment, not just the browser that toggled
// it. Every other Developer Admin section persists through this same generic store too - see
// backend/src/models/developerAdminSettings.model.js.
export interface UiVisibilityConfig {
    hiddenQuickActions: string[];
    hiddenSidebarItems: string[];
}

export type UiVisibilityPayload = UiVisibilityConfig;

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

async function parseResponse<T>(response: Response): Promise<T> {
    const result: ApiResponse<T> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Request failed');
    }
    return result.data;
}

export async function getUiVisibility(): Promise<UiVisibilityConfig> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin-settings/${SETTING_KEY}`);
    const value = await parseResponse<Partial<UiVisibilityConfig>>(response);
    return { hiddenQuickActions: value.hiddenQuickActions ?? [], hiddenSidebarItems: value.hiddenSidebarItems ?? [] };
}

export async function updateUiVisibility(payload: UiVisibilityPayload): Promise<UiVisibilityConfig> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin-settings/${SETTING_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: payload }),
    });
    return parseResponse<UiVisibilityConfig>(response);
}
