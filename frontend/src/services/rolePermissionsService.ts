import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';
import { getModuleKeyForPath } from '../common/constants/roleModules';

const SETTING_KEY = 'role-permissions';

// Maps a roleId (see CommonUtilities.tsx's ROLE_OPTIONS) to the list of module keys
// (roleModules.ts) that role is allowed to see. A role with NO entry here is treated as
// unrestricted (every module allowed) - so assigning this feature for the first time never
// silently locks existing users out of everything until an admin explicitly opts a role into
// restrictions via VisibilitySettingsPanel. Backed by the same generic Developer Admin
// settings store as 'ui-visibility' (see uiVisibilityService.ts) - just a different key.
export type RolePermissionsConfig = Record<string, string[]>;

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

export async function getRolePermissions(): Promise<RolePermissionsConfig> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin-settings/${SETTING_KEY}`);
    const value = await parseResponse<RolePermissionsConfig | null>(response);
    return value ?? {};
}

export async function updateRolePermissions(payload: RolePermissionsConfig): Promise<RolePermissionsConfig> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin-settings/${SETTING_KEY}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: payload }),
    });
    return parseResponse<RolePermissionsConfig>(response);
}

// Central permission check, shared by SideBarNavigation.tsx (hide) and routers.tsx (route
// guard -> NoAccess) so the two can never disagree about what a role can reach.
export function isModuleAllowed(pathname: string, roleId: string | null, isHidden: boolean, rolePermissions: RolePermissionsConfig): boolean {
    if (isHidden) return true;
    if (!roleId) return true;
    // Dashboard is always reachable regardless of role (see RolePermissionsPanel.tsx's
    // DASHBOARD_KEY comment) - its switch there is permanently ON and disabled, which means it
    // is deliberately never written into a role's saved module-key array. Checked here, not
    // just assumed from the UI, so that omission doesn't turn into every configured role
    // actually losing Dashboard access the moment it's saved.
    if (getModuleKeyForPath(pathname) === '/') return true;
    const allowed = rolePermissions[roleId];
    if (!allowed) return true;
    return allowed.includes(getModuleKeyForPath(pathname));
}
