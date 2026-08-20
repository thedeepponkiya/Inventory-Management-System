import { useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextDefinition';
import { useAuthContext } from '../../../context/AuthContextDefinition';
import { isModuleAllowed } from '../../../services/rolePermissionsService';
import {
    HiOutlineTruck, // Material Inward nav item hidden below
    HiOutlineArchiveBox,
    HiOutlineMapPin,
    HiOutlineSquares2X2,
    HiOutlineSquare3Stack3D,
    HiOutlineShoppingCart,
    HiOutlineClipboardDocumentList, // Purchase Order nav item hidden below
    HiOutlineFolder,
    HiOutlineTag,
    HiOutlineScale,
    HiOutlineBuildingStorefront, // Vendor nav item hidden below
    HiOutlineUserCircle,
    HiOutlineDocumentText, // Invoices nav item hidden below
    HiOutlineChartBar, // Reports nav item hidden below
    HiOutlineUsers, // Users nav item hidden below
    HiOutlineCog6Tooth,
    HiOutlineUserGroup,
    HiOutlineChartPie,
    HiOutlineChevronRight,
    HiOutlineChevronDown,
    HiOutlineChevronDoubleLeft,
    HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { BsBoxSeam } from 'react-icons/bs';
import inventoryLogo from '../../../assets/inventoryLogo.png';
import inventoryWordmark from '../../../assets/inventoryWordmark.png';
import SettingsDialog from '../settingsDialog/SettingsDialog';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import './SideBarNavigation.css';

const dashboardItem = { label: 'Dashboard', path: '/', icon: HiOutlineSquares2X2 };

const navGroups = [
    {
        groupLabel: 'Operation',
        items: [
            { label: 'Inventories', path: '/home', icon: BsBoxSeam, iconSize: 17 },
            { label: 'Material Inward', path: '/material-inward', icon: HiOutlineTruck },
            { label: 'Purchase Order', path: '/purchase-order', icon: HiOutlineClipboardDocumentList },
            { label: 'Finished SKU', path: '/raw-sku', icon: HiOutlineArchiveBox },
            { label: 'BOM', path: '/bom', icon: HiOutlineSquare3Stack3D },
            { label: 'Sales Order', path: '/sales-order', icon: HiOutlineShoppingCart },
        ],
    },
    {
        groupLabel: 'Master',
        items: [
            { label: 'Locations', path: '/locations', icon: HiOutlineMapPin },
            { label: 'Category', path: '/category', icon: HiOutlineFolder },
            { label: 'Product Type', path: '/product-type', icon: HiOutlineTag },
            { label: 'Unit', path: '/unit', icon: HiOutlineScale },
            { label: 'Vendor', path: '/vendor', icon: HiOutlineBuildingStorefront },
            { label: 'Customer', path: '/customer', icon: HiOutlineUserCircle },
        ],
    },
    {
        groupLabel: 'Billing',
        items: [
            { label: 'Invoices', path: '/invoices', icon: HiOutlineDocumentText },
        ],
    },
    {
        groupLabel: 'Analytics',
        items: [
            { label: 'Reports', path: '/reports', icon: HiOutlineChartBar },
        ],
    },
];

// Rendered separately from navGroups, as its own collapsible parent menu rather than an
// always-expanded groupLabel section - mirrors crmMenu's shape/behavior below.
const administrationMenu = {
    label: 'Administration',
    icon: HiOutlineShieldCheck,
    items: [
        { label: 'Users', path: '/users', icon: HiOutlineUsers },
    ],
};

// Rendered separately from navGroups, as its own collapsible parent menu rather than an
// always-expanded groupLabel section - only Sources and Settings have a real page so far,
// the rest render a blank content area until their own module ships.
const crmMenu = {
    label: 'CRM',
    icon: HiOutlineUserGroup,
    items: [
        { label: 'Dashboard', path: '/crm', icon: HiOutlineChartBar },
        { label: 'Leads', path: '/crm/leads', icon: HiOutlineUsers },
        { label: 'Follow-ups', path: '/crm/followups', icon: HiOutlineClipboardDocumentList },
        { label: 'Sources', path: '/crm/sources', icon: HiOutlineBuildingStorefront },
        { label: 'Reports', path: '/crm/reports', icon: HiOutlineChartPie },
        { label: 'Settings', path: '/crm/settings', icon: HiOutlineCog6Tooth },
    ],
};

const SidePanel = () => {
    const { isSidePanelOpen, setIsSidePanelOpen, isMobileSidebarOpen, setIsMobileSidebarOpen, hiddenSidebarItems, rolePermissions } = useContext(AppContext);
    const { user } = useAuthContext();
    // Admin-controlled (VisibilitySettingsDialog) - covers crmMenu.items too, since every
    // path across navGroups/dashboardItem/crmMenu is globally unique.
    const hiddenPaths: string[] = hiddenSidebarItems ?? [];
    // Role-based restriction (rolePermissionsService.ts) - a separate, per-role mechanism on
    // top of the admin's global hiddenPaths above; an item needs to pass both checks to show.
    const isAllowedForRole = (path: string) => isModuleAllowed(path, user?.roleId ?? null, user?.isHidden ?? false, rolePermissions ?? {});
    const visibleCrmItems = crmMenu.items.filter((item) => !hiddenPaths.includes(item.path) && isAllowedForRole(item.path));
    const visibleAdminItems = administrationMenu.items.filter((item) => !hiddenPaths.includes(item.path) && isAllowedForRole(item.path));
    const expanded = isSidePanelOpen;
    // Lifted to AppContext (not local state) so Header.tsx's hamburger button - a proper
    // flex child of the header row, so it always vertically aligns with the title text
    // regardless of the header's height - can open this same drawer from a sibling component.
    const mobileOpen = isMobileSidebarOpen;
    const setMobileOpen = setIsMobileSidebarOpen;
    const [settingsOpen, setSettingsOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const location = useLocation();
    // Starts open automatically if already on a CRM page (e.g. after a refresh).
    const [crmMenuOpen, setCrmMenuOpen] = useState(location.pathname.startsWith('/crm'));
    // Same auto-open-on-refresh behavior as crmMenuOpen, keyed to this menu's own item paths.
    const [adminMenuOpen, setAdminMenuOpen] = useState(administrationMenu.items.some((item) => location.pathname.startsWith(item.path)));
    // Collapsed-rail flyouts (see isCollapsedFlyout below) are portaled to document.body since
    // .side-panel has overflow:hidden (needed to clip the wordmark/labels during the collapse/
    // expand width transition) - a plain position:absolute/fixed child would get clipped
    // right along with everything else in that box. Portaling means it needs its own
    // viewport coordinates instead of relying on CSS positioning against a sidebar ancestor,
    // captured from the toggle button's own position at the moment it's opened.
    const adminToggleRef = useRef<HTMLButtonElement>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const crmToggleRef = useRef<HTMLButtonElement>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [adminFlyoutPos, setAdminFlyoutPos] = useState<{ top: number; left: number } | null>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [crmFlyoutPos, setCrmFlyoutPos] = useState<{ top: number; left: number } | null>(DEFAULT_DATA_TYPE_VALUE.NULL);

    // '/' and '/crm' are index/dashboard routes - startsWith would otherwise also match
    // every nested path under them (e.g. '/crm/leads'), highlighting Dashboard alongside
    // whatever CRM sub-page is actually active.
    const isItemActive = (path: string) => (path === '/' || path === '/crm' ? location.pathname === path : location.pathname.startsWith(path));

    const toggleExpanded = () => setIsSidePanelOpen((prev: boolean) => !prev);

    // Collapsed rail is only 56px wide - no room for a label, so a submenu opened there can't
    // render inline (it used to, and just showed a stack of unlabeled icons squeezed into that
    // same narrow column). Instead it renders as a floating flyout positioned outside the rail
    // (see .sidebar-flyout), same idea as VS Code's activity bar / most collapsed admin
    // sidebars. Mobile's drawer always opens fully expanded regardless of this desktop
    // collapse state (see the comment above .side-panel below), so it keeps the normal inline
    // submenu too.
    const isCollapsedFlyout = !expanded && !mobileOpen;

    const toggleAdminMenu = () => {
        if (isCollapsedFlyout && !adminMenuOpen && adminToggleRef.current) {
            const rect = adminToggleRef.current.getBoundingClientRect();
            setAdminFlyoutPos({ top: rect.top, left: rect.right + 8 });
        }
        setAdminMenuOpen((prev) => !prev);
    };

    const toggleCrmMenu = () => {
        if (isCollapsedFlyout && !crmMenuOpen && crmToggleRef.current) {
            const rect = crmToggleRef.current.getBoundingClientRect();
            setCrmFlyoutPos({ top: rect.top, left: rect.right + 8 });
        }
        setCrmMenuOpen((prev) => !prev);
    };

    return (
        <>
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* On mobile the drawer always opens fully expanded (labels visible), regardless
                of the desktop collapse/expand toggle state - a narrow icon-only rail sliding
                in wouldn't be usable as a mobile drawer. */}
            <div className={`side-panel${(expanded || mobileOpen) ? ' side-panel--expanded' : ''} ${mobileOpen ? 'side-panel--open' : ''}`}>
                <div
                    className="sidebar-logo"
                    onClick={toggleExpanded}
                    role="button"
                    tabIndex={0}
                    aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpanded();
                        }
                    }}
                >
                    <img src={inventoryLogo} alt="Inventory System logo" className="sidebar-logo-icon" width={44} height={43} />
                    <img src={inventoryWordmark} alt="Inventory System" className="sidebar-logo-title" />
                    {/* Only shown expanded - there's no room for it in the 56px collapsed rail,
                        and clicking the logo icon itself still re-expands the sidebar from
                        there. A separate <button> (not the whole .sidebar-logo div) so it gets
                        its own click target instead of just relying on the div wrapper's. */}
                    {expanded && (
                        <button
                            type="button"
                            className="sidebar-collapse-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded();
                            }}
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                        >
                            <HiOutlineChevronDoubleLeft size={16} />
                        </button>
                    )}
                </div>

                <div className="sidebar-items">
                    {!hiddenPaths.includes(dashboardItem.path) && isAllowedForRole(dashboardItem.path) && (
                        <NavLink
                            to={dashboardItem.path}
                            end
                            className={`sidebar-item${isItemActive(dashboardItem.path) ? ' sidebar-item--active' : ''}`}
                            title={dashboardItem.label}
                            onClick={() => setMobileOpen(false)}
                        >
                            <dashboardItem.icon size={19} />
                            <span>{dashboardItem.label}</span>
                        </NavLink>
                    )}

                    {visibleCrmItems.length > 0 && (
                        <div className="sidebar-group">
                            <button
                                ref={crmToggleRef}
                                type="button"
                                className={`sidebar-item sidebar-item--toggle${crmMenuOpen ? ' sidebar-item--active' : ''}`}
                                onClick={toggleCrmMenu}
                            >
                                <crmMenu.icon size={19} />
                                <span>{crmMenu.label}</span>
                                {crmMenuOpen ? <HiOutlineChevronDown size={16} className="sidebar-item-chevron" /> : <HiOutlineChevronRight size={16} className="sidebar-item-chevron" />}
                            </button>
                            {crmMenuOpen && isCollapsedFlyout && crmFlyoutPos && createPortal(
                                <>
                                    <div className="sidebar-flyout-catcher" onClick={() => setCrmMenuOpen(false)} />
                                    <div className="sidebar-flyout" style={{ top: crmFlyoutPos.top, left: crmFlyoutPos.left }}>
                                        <span className="sidebar-flyout-title">{crmMenu.label}</span>
                                        {visibleCrmItems.map(({ label, path, icon: Icon }) => (
                                            <NavLink
                                                key={path}
                                                to={path}
                                                end={path === '/crm'}
                                                className={`sidebar-item sidebar-subitem${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                                title={label}
                                                onClick={() => setCrmMenuOpen(false)}
                                            >
                                                <Icon size={17} />
                                                <span>{label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                </>,
                                document.body
                            )}
                            {crmMenuOpen && !isCollapsedFlyout && (
                                <div className="sidebar-submenu">
                                    {visibleCrmItems.map(({ label, path, icon: Icon }) => (
                                        <NavLink
                                            key={path}
                                            to={path}
                                            end={path === '/crm'}
                                            className={`sidebar-item sidebar-subitem${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                            title={label}
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <Icon size={17} />
                                            <span>{label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter((item) => !hiddenPaths.includes(item.path) && isAllowedForRole(item.path));
                        // Skip the whole group (divider + label included) once every item in
                        // it has been hidden - otherwise an empty heading with nothing under
                        // it would still show.
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={group.groupLabel} className="sidebar-group">
                                <div className="sidebar-group-divider">
                                    <span className="sidebar-group-label">{group.groupLabel}</span>
                                </div>
                                {visibleItems.map(({ label, path, icon: Icon, iconSize }) => (
                                    <NavLink
                                        key={path}
                                        to={path}
                                        className={`sidebar-item${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                        title={label}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <Icon size={iconSize ?? 19} />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}

                    {visibleAdminItems.length > 0 && (
                        <div className="sidebar-group">
                            <button
                                ref={adminToggleRef}
                                type="button"
                                className={`sidebar-item sidebar-item--toggle${adminMenuOpen ? ' sidebar-item--active' : ''}`}
                                onClick={toggleAdminMenu}
                            >
                                <administrationMenu.icon size={19} />
                                <span>{administrationMenu.label}</span>
                                {adminMenuOpen ? <HiOutlineChevronDown size={16} className="sidebar-item-chevron" /> : <HiOutlineChevronRight size={16} className="sidebar-item-chevron" />}
                            </button>
                            {adminMenuOpen && isCollapsedFlyout && adminFlyoutPos && createPortal(
                                <>
                                    <div className="sidebar-flyout-catcher" onClick={() => setAdminMenuOpen(false)} />
                                    <div className="sidebar-flyout" style={{ top: adminFlyoutPos.top, left: adminFlyoutPos.left }}>
                                        <span className="sidebar-flyout-title">{administrationMenu.label}</span>
                                        {visibleAdminItems.map(({ label, path, icon: Icon }) => (
                                            <NavLink
                                                key={path}
                                                to={path}
                                                className={`sidebar-item sidebar-subitem${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                                title={label}
                                                onClick={() => setAdminMenuOpen(false)}
                                            >
                                                <Icon size={17} />
                                                <span>{label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                </>,
                                document.body
                            )}
                            {adminMenuOpen && !isCollapsedFlyout && (
                                <div className="sidebar-submenu">
                                    {visibleAdminItems.map(({ label, path, icon: Icon }) => (
                                        <NavLink
                                            key={path}
                                            to={path}
                                            className={`sidebar-item sidebar-subitem${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                            title={label}
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <Icon size={17} />
                                            <span>{label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="sidebar-footer">
                    <button type="button" className="sidebar-item" title="Settings" onClick={() => setSettingsOpen(true)}>
                        <HiOutlineCog6Tooth size={19} />
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            <SettingsDialog visible={settingsOpen} onHide={() => setSettingsOpen(false)} />
        </>
    );
};

export default SidePanel;
