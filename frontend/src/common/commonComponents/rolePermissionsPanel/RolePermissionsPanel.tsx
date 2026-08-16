import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { HiOutlineInformationCircle, HiOutlineShieldCheck, HiOutlineUser, HiOutlineArrowPath, HiOutlineCheckCircle } from 'react-icons/hi2';
import { getRolePermissions, updateRolePermissions, type RolePermissionsConfig } from '../../../services/rolePermissionsService';
import { ROLE_MODULES } from '../../constants/roleModules';
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

const RolePermissionsPanel = ({ onSaved }: RolePermissionsPanelProps) => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [permissions, setPermissions] = useState<RolePermissionsConfig>({});
    const [selectedRole, setSelectedRole] = useState<string>(ROLE_OPTIONS[0]);
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

            <div className="role-permissions-table">
                <div className="role-permissions-table-head">
                    <span>Modules</span>
                    <span>Access</span>
                </div>
                <div className="role-permissions-list">
                    {ROLE_MODULES.map((mod) => {
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
        </div>
    );
};
export default RolePermissionsPanel;
