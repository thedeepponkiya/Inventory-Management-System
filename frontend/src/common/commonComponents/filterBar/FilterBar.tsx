import { useContext } from 'react';
import type { IconType } from 'react-icons';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { AppContext } from '../../../context/AppContextDefinition';
import {
    HiOutlineArchiveBox,
    HiOutlineClipboardDocumentList,
    HiOutlineFunnel,
    HiOutlineShoppingCart,
    HiOutlineTruck, // Material Inward quick action hidden below
} from 'react-icons/hi2';
import { MdFilterAltOff } from 'react-icons/md';
// BOM = Bill of Materials, a hierarchical parent/component breakdown - a sitemap glyph
// reads as "hierarchy" more clearly than the hi2 (Heroicons) set's plain box/tag icons.
import { FaSitemap } from 'react-icons/fa6';
import { BsBoxSeam } from 'react-icons/bs';
import { NavLink } from 'react-router-dom';
import './FilterBar.css';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterField {
    key: string;
    type: 'search' | 'select' | 'dateRange';
    label?: string;
    placeholder?: string;
    options?: FilterOption[];
}

export interface FilterBarQuickAction {
    label: string;
    path: string;
    icon: IconType;
    // Defaults to 15 (see the render loop below) - only set when an icon's glyph reads too
    // small at the default size relative to the others.
    iconSize?: number;
}

interface FilterBarProps {
    fields: FilterField[];
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    onReset?: () => void;
    actions?: React.ReactNode;
    // Rendered after the "Clear filters" icon button, unlike `actions` (which renders
    // before the search field) - for controls that need to sit at the very end of the row.
    trailingActions?: React.ReactNode;
    quickActions?: FilterBarQuickAction[];
}

const defaultQuickActions: FilterBarQuickAction[] = [
    { label: 'Inventories', path: '/home', icon: BsBoxSeam, iconSize: 13 },
    { label: 'Purchase Order', path: '/purchase-order', icon: HiOutlineClipboardDocumentList, iconSize: 18 },
    { label: 'Material Inward', path: '/material-inward', icon: HiOutlineTruck, iconSize: 18 },
    { label: 'Finished SKU', path: '/raw-sku', icon: HiOutlineArchiveBox, iconSize: 18 },
    { label: 'BOM', path: '/bom', icon: FaSitemap },
    { label: 'Sales Order', path: '/sales-order', icon: HiOutlineShoppingCart, iconSize: 18 },
];

const FilterBar = ({ fields, values, onChange, onReset, actions, trailingActions, quickActions }: FilterBarProps) => {
    const { hiddenQuickActions } = useContext(AppContext);
    const searchFields = fields.filter((field) => field.type === 'search');
    const otherFields = fields.filter((field) => field.type !== 'search');
    // Filtered against the admin's hidden-items list (VisibilitySettingsDialog) regardless of
    // whether this is the default list or an explicitly-passed one (e.g. CRM's own
    // crmQuickActions) - every quick action's path is globally unique across both lists, so
    // one hidden-paths array covers both without any special-casing here.
    const effectiveQuickActions = (quickActions ?? defaultQuickActions).filter((qa) => !((hiddenQuickActions as string[]) ?? []).includes(qa.path));

    return (
        <div className="filter-bar">
            <div className="filter-bar-quick-actions">
                {effectiveQuickActions.map((qa) => (
                    <NavLink
                        key={qa.path}
                        to={qa.path}
                        className={({ isActive }) => `filter-bar-quick-action${isActive ? ' filter-bar-quick-action--active' : ''}`}
                    >
                        <qa.icon size={qa.iconSize ?? 15} />
                        {qa.label}
                    </NavLink>
                ))}
            </div>

            <div className="filter-bar-controls">
                {otherFields.map((field) => (
                    <div className="filter-bar-field" key={field.key}>
                        {field.label && <label className="filter-bar-label">{field.label}</label>}
                        {field.type === 'select' && (
                            <Dropdown
                                value={values[field.key] ?? null}
                                options={field.options ?? []}
                                onChange={(e) => onChange(field.key, e.value)}
                                placeholder={field.placeholder ?? 'Select'}
                                className="filter-bar-dropdown"
                                showClear
                            />
                        )}
                        {field.type === 'dateRange' && (
                            <Calendar
                                value={(values[field.key] as Date[]) ?? null}
                                onChange={(e) => onChange(field.key, e.value)}
                                selectionMode="range"
                                readOnlyInput
                                placeholder={field.placeholder ?? 'Select date range'}
                                className="filter-bar-calendar"
                                dateFormat="dd M yy"
                            />
                        )}
                    </div>
                ))}

                {actions}

                {searchFields.map((field) => (
                    <span className="filter-bar-search" key={field.key}>
                        <HiOutlineFunnel className="filter-bar-search-icon" />
                        <InputText
                            value={(values[field.key] as string) ?? ''}
                            placeholder={field.placeholder ?? 'Filter by keyword'}
                            onChange={(e) => onChange(field.key, e.target.value)}
                        />
                    </span>
                ))}

                {onReset && (
                    <Button className="filter-bar-clear-btn" icon={<MdFilterAltOff />} outlined size="small" onClick={onReset} aria-label="Clear filters" />
                )}

                {trailingActions}
            </div>
        </div>
    );
};

export default FilterBar;
