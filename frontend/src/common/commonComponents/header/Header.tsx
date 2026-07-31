import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { FaRegBell } from 'react-icons/fa6';
import { HiChevronRight, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi2';
import { getRouteMeta } from '../../../routers/routeMeta';
import { useAuthContext } from '../../../context/AuthContextDefinition';
import { useThemeContext } from '../../../context/ThemeContextDefinition';
import './Header.css';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuthContext();
    const { theme, toggleTheme } = useThemeContext();
    const meta = getRouteMeta(location.pathname);
    const menuRef = useRef<Menu>(null);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const userMenuItems = [
        { label: 'Profile', icon: 'pi pi-user' },
        { label: 'Logout', icon: 'pi pi-sign-out', command: handleLogout },
    ];

    return (
        <div className="app-header py-2 px-3 flex items-center justify-between">
            <div className="app-header-title-block max-[900px]:pl-12 flex items-center gap-2">
                <span className="app-header-brand">Inventory</span>
                <HiChevronRight size={14} className="app-header-crumb-sep" />
                <span className="app-header-crumb-page">{meta.title}</span>
            </div>

            <div className="app-header-actions">
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
                    <Avatar label="A" shape="circle" className="bg-purple-500 text-white" />
                </div>
                <Menu model={userMenuItems} popup ref={menuRef} popupAlignment="right" />
            </div>
        </div>
    );
};
export default Header;
