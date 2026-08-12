import { useContext, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import {
    HiOutlineSquares2X2,
    HiOutlineKey,
    HiOutlineShare,
    HiOutlineListBullet,
    HiOutlinePuzzlePiece,
    HiOutlineCircleStack,
    HiOutlineDocumentText,
    HiOutlineClock,
    HiOutlineEnvelope,
    HiOutlineBell,
    HiOutlineShieldCheck,
    HiOutlineCubeTransparent,
    HiOutlineArrowsUpDown,
    HiOutlineHeart,
    HiOutlineClipboardDocumentList,
    HiOutlineArrowPath,
    HiOutlineEyeSlash,
    HiOutlineCheckCircle,
} from 'react-icons/hi2';
import { useAuthContext } from '../../context/AuthContextDefinition';
import { AppContext } from '../../context/AppContextDefinition';
import VisibilitySettingsPanel, { type VisibilitySettingsPanelHandle } from '../../common/commonComponents/visibilitySettingsDialog/VisibilitySettingsPanel';
import './DeveloperAdmin.css';

const devAdminMenu = [
    { key: 'overview', label: 'Overview', icon: HiOutlineSquares2X2 },
    { key: 'api-keys', label: 'API Keys', icon: HiOutlineKey },
    { key: 'webhooks', label: 'Webhooks', icon: HiOutlineShare },
    { key: 'custom-fields', label: 'Custom Fields', icon: HiOutlineListBullet },
    { key: 'modules-features', label: 'Modules & Features', icon: HiOutlinePuzzlePiece },
    { key: 'manage-visibility', label: 'Manage Visibility', icon: HiOutlineEyeSlash },
    { key: 'database-backup', label: 'Database Backup', icon: HiOutlineCircleStack },
    { key: 'system-logs', label: 'System Logs', icon: HiOutlineDocumentText },
    { key: 'scheduled-jobs', label: 'Scheduled Jobs', icon: HiOutlineClock },
    { key: 'email-templates', label: 'Email Templates', icon: HiOutlineEnvelope },
    { key: 'notifications', label: 'Notifications', icon: HiOutlineBell },
    { key: 'security', label: 'Security', icon: HiOutlineShieldCheck },
    { key: 'third-party-services', label: 'Third Party Services', icon: HiOutlineCubeTransparent },
    { key: 'import-export', label: 'Import / Export', icon: HiOutlineArrowsUpDown },
    { key: 'system-health', label: 'System Health', icon: HiOutlineHeart },
    { key: 'license-billing', label: 'License & Billing', icon: HiOutlineClipboardDocumentList },
    { key: 'version-updates', label: 'Version Updates', icon: HiOutlineArrowPath },
] as const;

type DevAdminSectionKey = (typeof devAdminMenu)[number]['key'];

// Gated here too, not just by the header link being hidden - the header only stops a
// regular user from seeing the *entry point*, it does nothing to stop someone who knows (or
// guesses) the URL from navigating straight to it. Redirects anyone whose account isn't the
// one hidden Super Admin (see AuthContextDefinition.ts's AuthUser.isHidden) back to the
// Dashboard, same pattern as the unauthenticated redirect in routers.tsx.
const DeveloperAdmin = () => {
    const { user } = useAuthContext();
    const { fetchUiVisibility } = useContext(AppContext);
    const [activeSection, setActiveSection] = useState<DevAdminSectionKey>('overview');
    const visibilityPanelRef = useRef<VisibilitySettingsPanelHandle>(null);

    if (!user?.isHidden) {
        return <Navigate to="/" replace />;
    }

    const activeItem = devAdminMenu.find((item) => item.key === activeSection);

    return (
        <div className="developer-admin-page">
            <div className="developer-admin-menu">
                {devAdminMenu.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={`developer-admin-menu-item${activeSection === item.key ? ' developer-admin-menu-item--active' : ''}`}
                        onClick={() => setActiveSection(item.key)}
                    >
                        <item.icon size={17} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="developer-admin-main">
                {/* Common toolbar for every section (mirrors SalesOrderForm's .so-form-toolbar
                    pattern) - title always shows; Save/Cancel only appear for sections that
                    actually have something to save. */}
                <div className="developer-admin-toolbar">
                    <div className="developer-admin-toolbar-title">
                        {activeItem && (
                            <span className="developer-admin-toolbar-icon">
                                <activeItem.icon size={17} />
                            </span>
                        )}
                        <h2>{activeItem?.label}</h2>
                    </div>
                    {activeSection === 'manage-visibility' && (
                        <div className="developer-admin-toolbar-actions">
                            <Button label="Cancel" outlined onClick={() => setActiveSection('overview')} />
                            <Button label="Save" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={() => visibilityPanelRef.current?.save()} />
                        </div>
                    )}
                </div>

                {activeSection === 'manage-visibility' ? (
                    <div className="developer-admin-content developer-admin-content--panel">
                        <VisibilitySettingsPanel ref={visibilityPanelRef} onSaved={fetchUiVisibility} hideHeader />
                    </div>
                ) : (
                    <div className="developer-admin-content">
                        <p>This section isn&apos;t built yet - coming soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default DeveloperAdmin;
