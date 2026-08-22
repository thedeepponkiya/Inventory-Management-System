import type { IconType } from 'react-icons';
import {
    HiOutlineSquares2X2,
    HiOutlineTruck,
    HiOutlineArchiveBox,
    HiOutlineMapPin,
    HiOutlineSquare3Stack3D,
    HiOutlineShoppingCart,
    HiOutlineClipboardDocumentList,
    HiOutlineFolder,
    HiOutlineTag,
    HiOutlineScale,
    HiOutlineBuildingStorefront,
    HiOutlineUserCircle,
    HiOutlineDocumentText,
    HiOutlineChartBar,
    HiOutlineChartPie,
    HiOutlineCog6Tooth,
    HiOutlineUsers,
} from 'react-icons/hi2';
import { BsBoxSeam } from 'react-icons/bs';

// Canonical list of permission-able modules for role-based access control - each entry's
// `key` is the module's own base route; any nested route under it (e.g. '/purchase-order/new',
// '/purchase-order/:id') is covered by the same key via getModuleKeyForPath below. Kept as its
// own file (not inlined in SideBarNavigation.tsx) so both the sidebar and routers.tsx's route
// guards, and RolePermissionsPanel's editor, share one source of truth. Icons mirror
// SideBarNavigation.tsx's own per-item icons so the two stay visually consistent.
export interface RoleModule {
    key: string;
    label: string;
    icon: IconType;
}

export const ERP_MODULES: RoleModule[] = [
    { key: '/', label: 'Dashboard', icon: HiOutlineSquares2X2 },
    { key: '/home', label: 'Inventories', icon: BsBoxSeam },
    { key: '/material-inward', label: 'Material Inward', icon: HiOutlineTruck },
    { key: '/purchase-order', label: 'Purchase Order', icon: HiOutlineClipboardDocumentList },
    { key: '/raw-sku', label: 'Finished SKU', icon: HiOutlineArchiveBox },
    { key: '/bom', label: 'BOM', icon: HiOutlineSquare3Stack3D },
    { key: '/sales-order', label: 'Sales Order', icon: HiOutlineShoppingCart },
    { key: '/locations', label: 'Locations', icon: HiOutlineMapPin },
    { key: '/category', label: 'Category', icon: HiOutlineFolder },
    { key: '/product-type', label: 'Product Type', icon: HiOutlineTag },
    { key: '/unit', label: 'Unit', icon: HiOutlineScale },
    { key: '/vendor', label: 'Vendor', icon: HiOutlineBuildingStorefront },
    { key: '/customer', label: 'Customer', icon: HiOutlineUserCircle },
    { key: '/invoices', label: 'Invoices', icon: HiOutlineDocumentText },
    { key: '/reports', label: 'Reports', icon: HiOutlineChartBar },
    { key: '/users', label: 'Users', icon: HiOutlineUsers },
];

// Broken out per individual CRM page (not one blanket '/crm' entry) so each CRM component can
// be individually shown/hidden per role. Mirrors crmMenu.items in SideBarNavigation.tsx and
// crmSidebarMenuItems in VisibilitySettingsPanel.tsx exactly - keep all three in sync.
export const CRM_MODULES: RoleModule[] = [
    { key: '/crm', label: 'Dashboard', icon: HiOutlineChartBar },
    { key: '/crm/leads', label: 'Leads', icon: HiOutlineUsers },
    { key: '/crm/followups', label: 'Follow-ups', icon: HiOutlineClipboardDocumentList },
    { key: '/crm/sources', label: 'Sources', icon: HiOutlineBuildingStorefront },
    { key: '/crm/reports', label: 'Reports', icon: HiOutlineChartPie },
    { key: '/crm/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

export const ROLE_MODULES: RoleModule[] = [...ERP_MODULES, ...CRM_MODULES];

// '/' only matches the exact dashboard route (otherwise it would prefix-match every other
// path). Every other module matches itself and everything nested under it, but CRM now has
// several sibling/nested keys ('/crm', '/crm/leads', ...), so a plain first-match-in-array
// would let the shorter '/crm' shadow a more specific '/crm/leads' if it happened to come
// first - picking the LONGEST matching key instead makes this correct regardless of array
// order. Falls back to the pathname itself if it doesn't belong to any known module (an
// unmapped route is treated as its own always-unrestricted key rather than silently matching
// the wrong module).
export function getModuleKeyForPath(pathname: string): string {
    if (pathname === '/') return '/';
    let best: RoleModule | undefined;
    for (const m of ROLE_MODULES) {
        if (m.key === '/') continue;
        const matches = pathname === m.key || pathname.startsWith(`${m.key}/`);
        if (matches && (!best || m.key.length > best.key.length)) best = m;
    }
    return best?.key ?? pathname;
}
