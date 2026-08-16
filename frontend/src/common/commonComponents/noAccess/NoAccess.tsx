import { HiOutlineLockClosed } from 'react-icons/hi2';
import './NoAccess.css';

// Rendered by routers.tsx's route guard in place of the real page whenever the logged-in
// user's role isn't permitted for the current path (see rolePermissionsService.ts) - reached
// only via direct URL navigation, since SideBarNavigation.tsx already hides the nav item
// itself for the same role.
const NoAccess = () => {
    return (
        <div className="no-access-page">
            <div className="no-access-icon">
                <HiOutlineLockClosed size={32} />
            </div>
            <h2 className="no-access-title">Access Denied</h2>
            <p className="no-access-desc">You don't have permission to view this page. Contact your administrator if you think this is a mistake.</p>
        </div>
    );
};

export default NoAccess;
