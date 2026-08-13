import { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextDefinition';
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
    HiOutlineMegaphone,
    HiOutlineChartPie,
    HiOutlineChevronRight,
    HiOutlineChevronDown,
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
    {
        groupLabel: 'Administration',
        items: [
            { label: 'Users', path: '/users', icon: HiOutlineUsers },
        ],
    },
];

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
        { label: 'Campaigns', path: '/crm/campaigns', icon: HiOutlineMegaphone },
        { label: 'Sources', path: '/crm/sources', icon: HiOutlineBuildingStorefront },
        { label: 'Reports', path: '/crm/reports', icon: HiOutlineChartPie },
        { label: 'Settings', path: '/crm/settings', icon: HiOutlineCog6Tooth },
    ],
};

const SidePanel = () => {
    const { isSidePanelOpen, setIsSidePanelOpen, isMobileSidebarOpen, setIsMobileSidebarOpen, hiddenSidebarItems } = useContext(AppContext);
    // Admin-controlled (VisibilitySettingsDialog) - covers crmMenu.items too, since every
    // path across navGroups/dashboardItem/crmMenu is globally unique.
    const hiddenPaths: string[] = hiddenSidebarItems ?? [];
    const visibleCrmItems = crmMenu.items.filter((item) => !hiddenPaths.includes(item.path));
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

    // '/' and '/crm' are index/dashboard routes - startsWith would otherwise also match
    // every nested path under them (e.g. '/crm/leads'), highlighting Dashboard alongside
    // whatever CRM sub-page is actually active.
    const isItemActive = (path: string) => (path === '/' || path === '/crm' ? location.pathname === path : location.pathname.startsWith(path));

    const toggleExpanded = () => setIsSidePanelOpen((prev: boolean) => !prev);

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
                </div>

                <div className="sidebar-items">
                    {!hiddenPaths.includes(dashboardItem.path) && (
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

                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter((item) => !hiddenPaths.includes(item.path));
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

                    {visibleCrmItems.length > 0 && (
                        <div className="sidebar-group">
                            <button
                                type="button"
                                className={`sidebar-item sidebar-item--toggle${crmMenuOpen ? ' sidebar-item--active' : ''}`}
                                onClick={() => setCrmMenuOpen((prev) => !prev)}
                            >
                                <crmMenu.icon size={19} />
                                <span>{crmMenu.label}</span>
                                {crmMenuOpen ? <HiOutlineChevronDown size={16} className="sidebar-item-chevron" /> : <HiOutlineChevronRight size={16} className="sidebar-item-chevron" />}
                            </button>
                            {crmMenuOpen && (
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
