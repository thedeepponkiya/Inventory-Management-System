import { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextDefinition';
import {
    HiOutlineTruck, // Material Inward nav item hidden below
    HiOutlineArchiveBox,
    HiOutlineMapPin,
    HiOutlineSquares2X2,
    HiOutlineCube,
    HiOutlineSquare3Stack3D,
    HiOutlineClipboardDocumentList, // Purchase Order nav item hidden below
    HiOutlineFolder,
    HiOutlineTag,
    HiOutlineBuildingStorefront, // Vendor nav item hidden below
    HiOutlineListBullet, // Transactions nav item hidden below
    HiOutlineDocumentText, // Invoices nav item hidden below
    HiOutlineChartBar, // Reports nav item hidden below
    HiOutlineUsers, // Users nav item hidden below
    HiOutlineCog6Tooth,
    HiOutlineBars3,
} from 'react-icons/hi2';
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
            { label: 'Inventories', path: '/home', icon: HiOutlineCube },
            { label: 'Material Inward', path: '/material-inward', icon: HiOutlineTruck },
            { label: 'Purchase Order', path: '/purchase-order', icon: HiOutlineClipboardDocumentList },
            { label: 'Finished SKU', path: '/raw-sku', icon: HiOutlineArchiveBox },
            { label: 'Orders', path: '/bom', icon: HiOutlineSquare3Stack3D },
        ],
    },
    {
        groupLabel: 'Master',
        items: [
            { label: 'Locations', path: '/locations', icon: HiOutlineMapPin },
            { label: 'Category', path: '/category', icon: HiOutlineFolder },
            { label: 'Product Type', path: '/product-type', icon: HiOutlineTag },
            { label: 'Vendor', path: '/vendor', icon: HiOutlineBuildingStorefront },
        ],
    },
    {
        groupLabel: 'Billing',
        items: [
            { label: 'Transactions', path: '/transactions', icon: HiOutlineListBullet },
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

const SidePanel = () => {
    const { isSidePanelOpen, setIsSidePanelOpen } = useContext(AppContext);
    const expanded = isSidePanelOpen;
    const [mobileOpen, setMobileOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [settingsOpen, setSettingsOpen] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const location = useLocation();

    const isItemActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

    const toggleExpanded = () => setIsSidePanelOpen((prev: boolean) => !prev);

    return (
        <>
            {/* Mobile toggle button */}
            <button
                type="button"
                className="sidebar-mobile-toggle"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Toggle navigation"
            >
                <HiOutlineBars3 size={22} />
            </button>

            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <div className={`side-panel${expanded ? ' side-panel--expanded' : ''} ${mobileOpen ? 'side-panel--open' : ''}`}>
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

                    {navGroups.map((group) => (
                        <div key={group.groupLabel} className="sidebar-group">
                            <div className="sidebar-group-divider">
                                <span className="sidebar-group-label">{group.groupLabel}</span>
                            </div>
                            {group.items.map(({ label, path, icon: Icon }) => (
                                <NavLink
                                    key={path}
                                    to={path}
                                    className={`sidebar-item${isItemActive(path) ? ' sidebar-item--active' : ''}`}
                                    title={label}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <Icon size={19} />
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
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
