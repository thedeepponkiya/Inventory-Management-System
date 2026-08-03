import { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextDefinition';
import {
    HiOutlineTruck,
    HiOutlineArchiveBox,
    HiOutlineMapPin,
    HiOutlineSquares2X2,
    HiOutlineCube,
    HiOutlineClipboardDocumentList,
    HiOutlineFolder,
    HiOutlineTag,
    HiOutlineBuildingStorefront,
    HiOutlineListBullet,
    HiOutlineDocumentText,
    HiOutlineChartBar,
    HiOutlineUsers,
    HiOutlineCog6Tooth,
    HiOutlineBars3,
} from 'react-icons/hi2';
import inventoryLogo from '../../../assets/inventoryLogo.svg';
import SettingsDialog from '../settingsDialog/SettingsDialog';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import './SideBarNavigation.css';

const dashboardItem = { label: 'Dashboard', path: '/', icon: HiOutlineSquares2X2 };

const navGroups = [
    {
        groupLabel: 'Operation',
        items: [
            { label: 'Inventory Home', path: '/home', icon: HiOutlineCube },
            { label: 'Material Inward', path: '/material-inward', icon: HiOutlineTruck },
            { label: 'Purchase Order', path: '/purchase-order', icon: HiOutlineClipboardDocumentList },
            { label: 'Raw SKU', path: '/raw-sku', icon: HiOutlineArchiveBox },
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
                    <img src={inventoryLogo} alt="Inventory System logo" width={35} height={35} />
                    <span className="sidebar-logo-title">Inventory System</span>
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
