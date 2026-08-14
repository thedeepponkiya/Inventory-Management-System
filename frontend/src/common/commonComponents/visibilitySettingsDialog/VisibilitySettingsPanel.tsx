import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import {
    HiOutlineEye,
    HiOutlineInformationCircle,
    HiOutlineXMark,
    HiOutlineChevronUp,
    HiOutlineChevronDown,
    HiOutlineListBullet,
    HiOutlineCheckCircle,
    HiBolt,
    HiCube,
    HiUsers,
    HiCheckCircle,
} from 'react-icons/hi2';
import { getUiVisibility, updateUiVisibility } from '../../../services/uiVisibilityService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../constants/commonConstant';
import { showToast } from '../../commonFunctions/commonFunction';
import './VisibilitySettingsPanel.css';

interface VisibilityItem {
    label: string;
    path: string;
}

// Mirrors FilterBar.tsx's defaultQuickActions (path list only - icons aren't needed for a
// plain on/off list here).
const quickActionItems: VisibilityItem[] = [
    { label: 'Inventories', path: '/home' },
    { label: 'Purchase Order', path: '/purchase-order' },
    { label: 'Material Inward', path: '/material-inward' },
    { label: 'Finished SKU', path: '/raw-sku' },
    { label: 'BOM', path: '/bom' },
    { label: 'Sales Order', path: '/sales-order' },
];

// Mirrors SideBarNavigation.tsx's dashboardItem + navGroups (path list only).
const sidebarMenuItems: VisibilityItem[] = [
    { label: 'Dashboard', path: '/' },
    { label: 'Inventories', path: '/home' },
    { label: 'Material Inward', path: '/material-inward' },
    { label: 'Purchase Order', path: '/purchase-order' },
    { label: 'Finished SKU', path: '/raw-sku' },
    { label: 'BOM', path: '/bom' },
    { label: 'Sales Order', path: '/sales-order' },
    { label: 'Locations', path: '/locations' },
    { label: 'Category', path: '/category' },
    { label: 'Product Type', path: '/product-type' },
    { label: 'Unit', path: '/unit' },
    { label: 'Vendor', path: '/vendor' },
    { label: 'Customer', path: '/customer' },
    { label: 'Invoices', path: '/invoices' },
    { label: 'Reports', path: '/reports' },
    { label: 'Users', path: '/users' },
];

// Mirrors crmQuickActions.ts and SideBarNavigation.tsx's crmMenu.items exactly. All paths
// across all four lists are globally unique, so every path still lives in the same two
// DB-backed arrays (hiddenQuickActions/hiddenSidebarItems) - no separate CRM-specific storage.
const crmQuickActionItems: VisibilityItem[] = [
    { label: 'Leads', path: '/crm/leads' },
    { label: 'Follow Ups', path: '/crm/followups' },
    { label: 'Campaigns', path: '/crm/campaigns' },
];

const crmSidebarMenuItems: VisibilityItem[] = [
    { label: 'Dashboard', path: '/crm' },
    { label: 'Leads', path: '/crm/leads' },
    { label: 'Follow-ups', path: '/crm/followups' },
    { label: 'Campaigns', path: '/crm/campaigns' },
    { label: 'Sources', path: '/crm/sources' },
    { label: 'Reports', path: '/crm/reports' },
    { label: 'Settings', path: '/crm/settings' },
];

type ModuleKey = 'erp' | 'crm';

interface ModuleDef {
    key: ModuleKey;
    label: string;
    fullLabel: string;
    icon: IconType;
    quickActionItems: VisibilityItem[];
    sidebarItems: VisibilityItem[];
}

const modules: Record<ModuleKey, ModuleDef> = {
    erp: {
        key: 'erp',
        label: 'ERP',
        fullLabel: 'Enterprise Resource Planning',
        icon: HiCube,
        quickActionItems,
        sidebarItems: sidebarMenuItems,
    },
    crm: {
        key: 'crm',
        label: 'CRM',
        fullLabel: 'Customer Relationship Management',
        icon: HiUsers,
        quickActionItems: crmQuickActionItems,
        sidebarItems: crmSidebarMenuItems,
    },
};

const moduleKeys: ModuleKey[] = ['erp', 'crm'];

const countVisible = (items: VisibilityItem[], hidden: string[]): number => items.filter((item) => !hidden.includes(item.path)).length;

export interface VisibilitySettingsPanelProps {
    // Called after a successful save so the caller can refetch AppContext's uiVisibility -
    // otherwise the sidebar/FilterBar on the current page wouldn't reflect the change until
    // a full reload.
    onSaved?: () => void;
    // Only rendered when provided and hideHeader is false - drives the modal usage's
    // (VisibilitySettingsDialog) header close (X) button and bottom Cancel button.
    onCancel?: () => void;
    // True for Developer Admin's inline usage, which builds ONE common page toolbar (title +
    // Save/Cancel, matching Sales/Purchase Order's form header) shared across every section of
    // that page, not just this one - so this panel renders none of its own header/actions,
    // and the parent drives Save via the ref handle below instead.
    hideHeader?: boolean;
}

export interface VisibilitySettingsPanelHandle {
    save: () => void;
}

// Shared core of the "Manage Visibility" feature - used both standalone (Developer Admin
// page, rendered directly inline) and inside VisibilitySettingsDialog's modal wrapper, so the
// switches/state/save logic exist in exactly one place.
const VisibilitySettingsPanel = forwardRef<VisibilitySettingsPanelHandle, VisibilitySettingsPanelProps>(({ onSaved, onCancel, hideHeader }, ref) => {
    const toast = useRef<Toast>(DEFAULT_DATA_TYPE_VALUE.NULL);
    const [hiddenQuickActions, setHiddenQuickActions] = useState<string[]>([]);
    const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
    // Starts true (not set synchronously inside the effect below) so the initial fetch never
    // triggers react-hooks/set-state-in-effect - this component is mounted fresh every time
    // it becomes visible (conditionally rendered by both callers), so a plain mount effect is
    // enough to refetch on every "open" without needing a Dialog onShow-style hook.
    const [loading, setLoading] = useState(DEFAULT_DATA_TYPE_VALUE.TRUE);
    const [saving, setSaving] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);
    const [selectedModule, setSelectedModule] = useState<ModuleKey>('erp');
    // Which accordion sections (keyed "erp-quick"/"erp-sidebar"/"crm-quick"/"crm-sidebar") are
    // expanded - independent per section, not a single-open-at-a-time accordion.
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['erp-quick']));

    useEffect(() => {
        getUiVisibility()
            .then((config) => {
                setHiddenQuickActions(config.hiddenQuickActions);
                setHiddenSidebarItems(config.hiddenSidebarItems);
            })
            .catch((err) => showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to load visibility settings'))
            .finally(() => setLoading(DEFAULT_DATA_TYPE_VALUE.FALSE));
    }, []);

    const toggleQuickAction = (path: string) => {
        setHiddenQuickActions((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
    };

    const toggleSidebarItem = (path: string) => {
        setHiddenSidebarItems((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
    };

    const toggleSection = (sectionKey: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionKey)) next.delete(sectionKey);
            else next.add(sectionKey);
            return next;
        });
    };

    const selectModule = (key: ModuleKey) => {
        setSelectedModule(key);
        setOpenSections((prev) => (prev.has(`${key}-quick`) ? prev : new Set(prev).add(`${key}-quick`)));
    };

    // "Show entire module" master switch - checked only when every item (both lists) for that
    // module is currently visible. Toggling it off hides the module's entire Quick Actions row
    // + entire sidebar menu in one go; toggling it back on clears all of them. It's a
    // derived/bulk-edit convenience over the same two arrays, not a separate persisted flag -
    // the per-item switches stay in sync since they read from the same state.
    const isModuleFullyVisible = (key: ModuleKey): boolean => {
        const mod = modules[key];
        return mod.quickActionItems.every((item) => !hiddenQuickActions.includes(item.path))
            && mod.sidebarItems.every((item) => !hiddenSidebarItems.includes(item.path));
    };

    const toggleModule = (key: ModuleKey) => {
        const mod = modules[key];
        const quickPaths = mod.quickActionItems.map((item) => item.path);
        const sidebarPaths = mod.sidebarItems.map((item) => item.path);
        if (isModuleFullyVisible(key)) {
            setHiddenQuickActions((prev) => [...prev, ...quickPaths.filter((p) => !prev.includes(p))]);
            setHiddenSidebarItems((prev) => [...prev, ...sidebarPaths.filter((p) => !prev.includes(p))]);
        } else {
            setHiddenQuickActions((prev) => prev.filter((p) => !quickPaths.includes(p)));
            setHiddenSidebarItems((prev) => prev.filter((p) => !sidebarPaths.includes(p)));
        }
    };

    const handleSave = async () => {
        setSaving(DEFAULT_DATA_TYPE_VALUE.TRUE);
        try {
            await updateUiVisibility({ hiddenQuickActions, hiddenSidebarItems });
            showToast(toast, 'success', 'Saved', 'Visibility settings updated for every user');
            onSaved?.();
        } catch (err) {
            showToast(toast, 'error', 'Error', err instanceof Error ? err.message : 'Failed to save visibility settings');
        } finally {
            setSaving(DEFAULT_DATA_TYPE_VALUE.FALSE);
        }
    };

    // Lets Developer Admin's common page toolbar (owned by the parent, not this panel) trigger
    // a save without needing its own copy of the switches state.
    useImperativeHandle(ref, () => ({ save: handleSave }));

    const renderAccordion = (mod: ModuleDef, kind: 'quick' | 'sidebar') => {
        const sectionKey = `${mod.key}-${kind}`;
        const isOpen = openSections.has(sectionKey);
        const items = kind === 'quick' ? mod.quickActionItems : mod.sidebarItems;
        const hiddenList = kind === 'quick' ? hiddenQuickActions : hiddenSidebarItems;
        const toggleFn = kind === 'quick' ? toggleQuickAction : toggleSidebarItem;
        const Icon = kind === 'quick' ? HiBolt : HiOutlineListBullet;
        const title = kind === 'quick' ? 'Quick Action Buttons' : 'Sidebar Menu Items';
        const subtitle = kind === 'quick' ? 'Show or hide buttons from the Quick Actions bar.' : 'Show or hide items from the sidebar menu.';
        const visibleCount = countVisible(items, hiddenList);

        return (
            <div className={`visibility-settings-accordion${isOpen ? ' visibility-settings-accordion--open' : ''}`} key={sectionKey}>
                <button type="button" className="visibility-settings-accordion-header" onClick={() => toggleSection(sectionKey)}>
                    <span className={`visibility-settings-icon-badge visibility-settings-icon-badge--${mod.key}`}>
                        <Icon size={16} />
                    </span>
                    <span className="visibility-settings-accordion-text">
                        <span className="visibility-settings-accordion-title">{title}</span>
                        <span className="visibility-settings-accordion-subtitle">{subtitle}</span>
                    </span>
                    <span className="visibility-settings-count-badge">{visibleCount} of {items.length} visible</span>
                    {isOpen ? <HiOutlineChevronUp size={16} /> : <HiOutlineChevronDown size={16} />}
                </button>
                {isOpen && (
                    <div className="visibility-settings-list">
                        {items.map((item) => (
                            <div className="visibility-settings-row" key={item.path}>
                                <span>{item.label}</span>
                                <InputSwitch checked={!hiddenList.includes(item.path)} onChange={() => toggleFn(item.path)} disabled={loading} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderModuleSection = (key: ModuleKey) => {
        const mod = modules[key];
        const totalVisible = countVisible(mod.quickActionItems, hiddenQuickActions) + countVisible(mod.sidebarItems, hiddenSidebarItems);
        const total = mod.quickActionItems.length + mod.sidebarItems.length;

        return (
            <div key={key} className="visibility-settings-module-detail">
                <div className="visibility-settings-module-detail-header">
                    <div>
                        <h3>{mod.label} Visibility Settings</h3>
                        <p>Manage what&apos;s visible in Quick Actions and Sidebar menu for {mod.label}.</p>
                    </div>
                    <div className="visibility-settings-module-detail-actions">
                        <span className="visibility-settings-count-badge">{totalVisible} of {total} visible</span>
                        <label className="visibility-settings-module-master">
                            <span>Show all</span>
                            <InputSwitch checked={isModuleFullyVisible(key)} onChange={() => toggleModule(key)} disabled={loading} />
                        </label>
                    </div>
                </div>
                {renderAccordion(mod, 'quick')}
                {renderAccordion(mod, 'sidebar')}
            </div>
        );
    };

    return (
        <div className="visibility-settings-panel">
            <Toast ref={toast} />

            {!hideHeader && (
                <div className="visibility-settings-header">
                    <span className="visibility-settings-header-icon"><HiOutlineEye size={20} /></span>
                    <div className="visibility-settings-header-text">
                        <h2>Manage Visibility</h2>
                        <p>Control what&apos;s visible in the Quick Actions and Sidebar menus for your workspace.</p>
                    </div>
                    {onCancel && (
                        <button type="button" className="visibility-settings-close-btn" onClick={onCancel} aria-label="Close">
                            <HiOutlineXMark size={18} />
                        </button>
                    )}
                </div>
            )}

            <div className="visibility-settings-banner">
                <HiOutlineInformationCircle size={20} className="visibility-settings-banner-icon" />
                <div>
                    <strong>Changes you make here will be applied for all users, on all browsers and devices.</strong>
                    <p>This setting is stored centrally and applies after every production build.</p>
                </div>
            </div>

            <div className="visibility-settings-body">
                <div className="visibility-settings-modules">
                    <div className="visibility-settings-modules-heading">
                        <h3>Select Module</h3>
                        <p>Choose a module to manage its visibility.</p>
                    </div>

                    {moduleKeys.map((key) => {
                        const mod = modules[key];
                        const total = mod.quickActionItems.length + mod.sidebarItems.length;
                        const isActive = selectedModule === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`visibility-settings-module-card${isActive ? ' visibility-settings-module-card--active' : ''}`}
                                onClick={() => selectModule(key)}
                            >
                                {isActive && <span className="visibility-settings-module-check"><HiCheckCircle size={16} /></span>}
                                <span className={`visibility-settings-icon-badge visibility-settings-icon-badge--${key} visibility-settings-icon-badge--lg`}>
                                    <mod.icon size={20} />
                                </span>
                                <span className="visibility-settings-module-name">{mod.label}</span>
                                <span className="visibility-settings-module-desc">{mod.fullLabel}</span>
                                <span className="visibility-settings-module-badge">{total} items</span>
                            </button>
                        );
                    })}
                </div>

                <div className="visibility-settings-main">
                    {renderModuleSection(selectedModule)}
                </div>
            </div>

            {!hideHeader && (
                <div className="visibility-settings-actions">
                    {onCancel && <button type="button" className="visibility-settings-cancel" onClick={onCancel}>Cancel</button>}
                    <button type="button" className="visibility-settings-save" onClick={handleSave} disabled={saving}>
                        <HiOutlineCheckCircle className="mr-2" />
                        Save
                    </button>
                </div>
            )}
        </div>
    );
});
VisibilitySettingsPanel.displayName = 'VisibilitySettingsPanel';
export default VisibilitySettingsPanel;
