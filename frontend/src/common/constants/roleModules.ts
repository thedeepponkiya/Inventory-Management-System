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
    HiOutlineUsers,
    HiOutlineUserGroup,
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

export const ROLE_MODULES: RoleModule[] = [
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
    { key: '/crm', label: 'CRM', icon: HiOutlineUserGroup },
];

// '/' only matches the exact dashboard route (otherwise it would prefix-match every other
// path); every other module's key covers itself and everything nested under it (e.g. '/crm'
// covers '/crm/leads', '/crm/followups', ... - CRM is permissioned as one module, not per
// sub-page). Falls back to the pathname itself if it doesn't belong to any known module (an
// unmapped route is treated as its own always-unrestricted key rather than silently matching
// the wrong module).
export function getModuleKeyForPath(pathname: string): string {
    if (pathname === '/') return '/';
    const match = ROLE_MODULES.find((m) => m.key !== '/' && (pathname === m.key || pathname.startsWith(`${m.key}/`)));
    return match?.key ?? pathname;
}
