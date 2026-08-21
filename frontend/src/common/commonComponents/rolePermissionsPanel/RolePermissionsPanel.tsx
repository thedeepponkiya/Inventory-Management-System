import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { HiOutlineInformationCircle, HiOutlineShieldCheck, HiOutlineUser, HiOutlineArrowPath, HiOutlineCheckCircle, HiCube, HiUsers, HiCheckCircle } from 'react-icons/hi2';
import { getRolePermissions, updateRolePermissions, type RolePermissionsConfig } from '../../../services/rolePermissionsService';
import { ROLE_MODULES, ERP_MODULES, CRM_MODULES, type RoleModule } from '../../constants/roleModules';
import { ROLE_OPTIONS } from '../../commonFunctions/CommonUtilities';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { showToast } from '../../commonFunctions/commonFunction';
import './RolePermissionsPanel.css';

interface RolePermissionsPanelProps {
    onSaved?: () => void;
}

// A role with no entry in `permissions` yet is unrestricted (every module allowed) - see
// rolePermissionsService.ts's isModuleAllowed. Falling back to the full module list here (not
// an empty array) keeps every switch showing ON for a never-configured role, matching what
// that role's users actually see today instead of misleadingly showing everything OFF.
const allModuleKeys = ROLE_MODULES.map((m) => m.key);
// Dashboard is always reachable regardless of role - every user needs a landing page after
// login, so its switch is locked ON rather than offered as a restrictable module.
const DASHBOARD_KEY = '/';

// ERP vs CRM, mirroring VisibilitySettingsPanel.tsx's module-card layout exactly (same icons,
// same two-column "select a module, then manage its items" pattern) so Developer Admin's Role
// Access and Manage Visibility panels feel like the same feature. CRM is broken into its
// individual pages here (see roleModules.ts's CRM_MODULES) instead of one blanket switch.
type ModuleCategory = 'erp' | 'crm';

interface CategoryDef {
    key: ModuleCategory;
    label: string;
    fullLabel: string;
    icon: IconType;
    modules: RoleModule[];
}

const categories: Record<ModuleCategory, CategoryDef> = {
    erp: { key: 'erp', label: 'ERP', fullLabel: 'Enterprise Resource Planning', icon: HiCube, modules: ERP_MODULES },
    crm: { key: 'crm', label: 'CRM', fullLabel: 'Customer Relationship Management', icon: HiUsers, modules: CRM_MODULES },
};

const categoryKeys: ModuleCategory[] = ['erp', 'crm'];

const RolePermissionsPanel = ({ onSaved }: RolePermissionsPanelProps) => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [permissions, setPermissions] = useState<RolePermissionsConfig>({});
    const [selectedRole, setSelectedRole] = useState<string>(ROLE_OPTIONS[0]);
    const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('erp');
    const [loading, setLoading] = useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [saving, setSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    useEffect(() => {
        getRolePermissions()
            .then((data) => setPermissions(data))
            .catch((err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to load role permissions'))
            .finally(() => setLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const allowedForSelectedRole = permissions[selectedRole] ?? allModuleKeys;

    const toggleModule = (moduleKey: string) => {
        setPermissions((prev) => {
            const current = prev[selectedRole] ?? allModuleKeys;
            const next = current.includes(moduleKey) ? current.filter((k) => k !== moduleKey) : [...current, moduleKey];
            return { ...prev, [selectedRole]: next };
        });
    };

    // "Allow entire module" master switch - checked only when every non-Dashboard item in that
    // category is currently allowed for the selected role. Toggling it off/on bulk-edits the
    // same underlying array, same derivation pattern as VisibilitySettingsPanel's
    // isModuleFullyVisible/toggleModule.
    const isCategoryFullyAllowed = (key: ModuleCategory): boolean =>
        categories[key].modules.every((mod) => mod.key === DASHBOARD_KEY || allowedForSelectedRole.includes(mod.key));

    const toggleCategory = (key: ModuleCategory) => {
        const keys = categories[key].modules.filter((mod) => mod.key !== DASHBOARD_KEY).map((mod) => mod.key);
        setPermissions((prev) => {
            const current = prev[selectedRole] ?? allModuleKeys;
            const next = isCategoryFullyAllowed(key)
                ? current.filter((k) => !keys.includes(k))
                : [...current, ...keys.filter((k) => !current.includes(k))];
            return { ...prev, [selectedRole]: next };
        });
    };

    // Clears this role's override entirely (not "check every switch") so it goes back to the
    // same unrestricted-by-default state a never-configured role has.
    const resetToDefault = () => {
        setPermissions((prev) => {
            const next = { ...prev };
            delete next[selectedRole];
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await updateRolePermissions(permissions);
            showToast(toast, 'success', 'Saved', 'Role permissions updated for every user');
            onSaved?.();
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to save role permissions');
        } finally {
            setSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    const renderCategoryDetail = (key: ModuleCategory) => {
        const cat = categories[key];
        const allowedCount = cat.modules.filter((mod) => mod.key === DASHBOARD_KEY || allowedForSelectedRole.includes(mod.key)).length;

        return (
            <div className="role-permissions-module-detail">
                <div className="role-permissions-module-detail-header">
                    <div>
                        <h3>{cat.label} Access</h3>
                        <p>Manage which {cat.label} modules {selectedRole} can access.</p>
                    </div>
                    <div className="role-permissions-module-detail-actions">
                        <span className="role-permissions-count-badge">{allowedCount} of {cat.modules.length} allowed</span>
                        <label className="role-permissions-module-master">
                            <span>Allow all</span>
                            <InputSwitch checked={isCategoryFullyAllowed(key)} onChange={() => toggleCategory(key)} disabled={loading || saving} />
                        </label>
                    </div>
                </div>
                <div className="role-permissions-list">
                    {cat.modules.map((mod) => {
                        const isDashboard = mod.key === DASHBOARD_KEY;
                        return (
                            <div className="role-permissions-row" key={mod.key}>
                                <span className="role-permissions-row-label">
                                    <span className="role-permissions-row-icon"><mod.icon size={16} /></span>
                                    {mod.label}
                                </span>
                                <InputSwitch
                                    checked={isDashboard || allowedForSelectedRole.includes(mod.key)}
                                    onChange={() => toggleModule(mod.key)}
                                    disabled={loading || saving || isDashboard}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="role-permissions-panel">
            <Toast ref={toast} />

            <div className="role-permissions-header">
                <span className="role-permissions-header-icon"><HiOutlineShieldCheck size={20} /></span>
                <div className="role-permissions-header-text">
                    <h2>Role Access</h2>
                    <p>Manage module access controls for each role.</p>
                </div>
                <div className="role-permissions-header-actions">
                    <Button label="Reset to Default" outlined icon={<HiOutlineArrowPath className="mr-2" />} onClick={resetToDefault} disabled={loading || saving} />
                    <Button label="Save Changes" icon={<HiOutlineCheckCircle className="mr-2" />} onClick={handleSave} loading={saving} disabled={loading} />
                </div>
            </div>

            <div className="role-permissions-banner">
                <HiOutlineInformationCircle size={20} className="role-permissions-banner-icon" />
                <div>
                    <strong>Controls which modules each role can access.</strong>
                    <p>Hidden modules disappear from the sidebar for that role, and direct navigation to their URL shows an Access Denied page.</p>
                </div>
            </div>

            <div className="role-permissions-role-select">
                <label>Select Role</label>
                <Dropdown
                    value={selectedRole}
                    options={ROLE_OPTIONS}
                    onChange={(e) => setSelectedRole(e.value)}
                    className="role-permissions-role-dropdown"
                    valueTemplate={(option) => option ? (
                        <span className="role-permissions-role-value"><HiOutlineUser size={15} />{option}</span>
                    ) : null}
                />
            </div>

            <div className="role-permissions-body">
                <div className="role-permissions-modules">
                    <div className="role-permissions-modules-heading">
                        <h3>Select Module</h3>
                        <p>Choose a module to manage its access.</p>
                    </div>

                    {categoryKeys.map((key) => {
                        const cat = categories[key];
                        const isActive = selectedCategory === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`role-permissions-module-card${isActive ? ' role-permissions-module-card--active' : ''}`}
                                onClick={() => setSelectedCategory(key)}
                            >
                                {isActive && <span className="role-permissions-module-check"><HiCheckCircle size={16} /></span>}
                                <span className={`role-permissions-icon-badge role-permissions-icon-badge--${key} role-permissions-icon-badge--lg`}>
                                    <cat.icon size={20} />
                                </span>
                                <span className="role-permissions-module-name">{cat.label}</span>
                                <span className="role-permissions-module-desc">{cat.fullLabel}</span>
                                <span className="role-permissions-module-badge">{cat.modules.length} modules</span>
                            </button>
                        );
                    })}
                </div>

                <div className="role-permissions-main">
                    {renderCategoryDetail(selectedCategory)}
                </div>
            </div>
        </div>
    );
};
export default RolePermissionsPanel;
