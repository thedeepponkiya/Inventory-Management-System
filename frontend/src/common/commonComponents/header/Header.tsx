import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Menu } from 'primereact/menu';
import { FaRegBell } from 'react-icons/fa6';
import { HiOutlineCalendar, HiChevronDown } from 'react-icons/hi2';
import { getRouteMeta } from '../../../routers/routeMeta';
import './Header.css';

const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const Header = () => {
    const location = useLocation();
    const meta = getRouteMeta(location.pathname);
    const menuRef = useRef<Menu>(null);

    const userMenuItems = [
        { label: 'Profile', icon: 'pi pi-user' },
        { label: 'Logout', icon: 'pi pi-sign-out' },
    ];

    return (
        <div className="app-header bg-white border-b border-gray-200 py-2 px-3 flex items-center justify-between">
            <div className="app-header-title-block max-[900px]:pl-12 flex items-center gap-2">
                <h1 className="app-header-title">{meta.title}</h1>
            </div>

            <div className="flex items-center gap-6">
                <div className="app-header-date">
                    <HiOutlineCalendar size={16} />
                    <span>{today}</span>
                </div>

                <div className="h-8 w-px bg-gray-200"></div>

                <div className="relative cursor-pointer">
                    <FaRegBell className="text-2xl text-gray-600" />
                    <Badge value="8" severity="danger" className="small-badge absolute -top-1 -right-1" />
                </div>

                <div className="h-8 w-px bg-gray-200"></div>

                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={(e) => menuRef.current?.toggle(e)}
                >
                    <Avatar label="A" shape="circle" className="bg-purple-500 text-white" />
                    <div className="app-header-user-text">
                        <div className="app-header-user-name">Admin User</div>
                        <div className="app-header-user-role">Administrator</div>
                    </div>
                    <HiChevronDown size={16} className="text-gray-500" />
                </div>
                <Menu model={userMenuItems} popup ref={menuRef} popupAlignment="right" />
            </div>
        </div>
    );
};
export default Header;
