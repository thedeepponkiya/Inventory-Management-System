import { useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import type { MenuItem } from 'primereact/menuitem';
import { FaRegBell } from 'react-icons/fa6';
import { HiBars3, HiChevronRight, HiOutlineSun, HiOutlineMoon, HiOutlineUser, HiOutlineArrowRightOnRectangle, HiOutlineCommandLine } from 'react-icons/hi2';
import { getRouteMeta } from '../../../routers/routeMeta';
import { useAuthContext } from '../../../context/AuthContextDefinition';
import { useThemeContext } from '../../../context/ThemeContextDefinition';
import { AppContext } from '../../../context/AppContextDefinition';
import { resolveImageUrl } from '../../commonFunctions/commonFunction';
import './Header.css';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthContext();
    const { theme, toggleTheme } = useThemeContext();
    const { setIsMobileSidebarOpen } = useContext(AppContext);
    const meta = getRouteMeta(location.pathname);
    const menuRef = useRef<Menu>(null);
    const avatarInitial = (user?.userName?.charAt(0) || 'A').toUpperCase();
    // Only pass `image` when there's a real uploaded photo - Avatar falls back to `label`
    // (the initial letter) whenever `image` is undefined, but not when it's an empty string.
    const avatarImage = user?.profileImage ? resolveImageUrl(user.profileImage) : undefined;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const userMenuItems: MenuItem[] = [
        {
            template: () => (
                <div className="app-header-user-menu-header">
                    <div className="app-header-user-menu-avatar-wrap">
                        <Avatar label={avatarImage ? undefined : avatarInitial} image={avatarImage} shape="circle" className="app-header-user-menu-avatar bg-purple-500 text-white" />
                        <span className="app-header-user-menu-online-dot" />
                    </div>
                    <div className="app-header-user-menu-info">
                        <span className="app-header-user-menu-name">{user?.userName || 'Admin User'}</span>
                        <span className="app-header-user-menu-email">{user?.email}</span>
                    </div>
                </div>
            ),
        },
        { separator: true },
        {
            label: 'Profile',
            template: (item, options) => (
                <a className={`app-header-user-menu-item ${options.className}`} onClick={options.onClick}>
                    <HiOutlineUser size={16} className="app-header-user-menu-item-icon" />
                    <span className={options.labelClassName}>{item.label}</span>
                </a>
            ),
        },
        {
            label: 'Logout',
            command: handleLogout,
            template: (item, options) => (
                <a className={`app-header-user-menu-item ${options.className}`} onClick={options.onClick}>
                    <HiOutlineArrowRightOnRectangle size={16} className="app-header-user-menu-item-icon" />
                    <span className={options.labelClassName}>{item.label}</span>
                </a>
            ),
        },
    ];

    return (
        <div className="app-header py-2 px-3 flex items-center justify-between">
            <div className="app-header-title-group flex items-center">
                {/* Mobile/tablet-only (see Header.css) - opens the same sidebar drawer that
                    used to be triggered by a fixed-position floating button. Rendered as a
                    normal flex child (not position:fixed) so it always vertically aligns with
                    the title text next to it, regardless of the header's own height. */}
                <button
                    type="button"
                    className="app-header-menu-btn"
                    aria-label="Open navigation"
                    onClick={() => setIsMobileSidebarOpen(true)}
                >
                    <HiBars3 size={26} />
                </button>

                <div className="app-header-title-block flex items-center gap-2">
                    <span className="app-header-brand">Inventory</span>
                    <HiChevronRight size={14} className="app-header-crumb-sep" />
                    <span className="app-header-crumb-page">{meta.title}</span>
                </div>

                {/* Mobile-only (see Header.css) - replaces the breadcrumb above with a plain
                    title, matching the app's mobile design. */}
                <div className="app-header-mobile-title">
                    <div className="app-header-mobile-text">
                        <h1>{meta.title}</h1>
                    </div>
                </div>
            </div>

            <div className="app-header-actions">
                {user?.isHidden && (
                    <button
                        type="button"
                        className="app-header-icon-btn"
                        aria-label="Developer Admin"
                        title="Developer Admin"
                        onClick={() => navigate('/developer-admin')}
                    >
                        <HiOutlineCommandLine size={18} />
                    </button>
                )}

                <button type="button" className="app-header-icon-btn app-header-icon-btn--relative" aria-label="Notifications">
                    <FaRegBell size={17} />
                    <Badge value="8" severity="danger" className="small-badge absolute -top-1 -right-1" />
                </button>

                <button
                    type="button"
                    className="app-header-icon-btn"
                    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ? <HiOutlineMoon size={18} /> : <HiOutlineSun size={18} />}
                </button>

                <div className="app-header-avatar-btn" onClick={(e) => menuRef.current?.toggle(e)}>
                    <Avatar label={avatarImage ? undefined : avatarInitial} image={avatarImage} shape="circle" className="bg-purple-500 text-white" />
                </div>
                <Menu model={userMenuItems} popup ref={menuRef} popupAlignment="right" className="app-header-user-menu" />
            </div>
        </div>
    );
};
export default Header;
