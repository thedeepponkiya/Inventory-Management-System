import type { IconType } from 'react-icons';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import {
    HiOutlineArchiveBox,
    HiOutlineClipboardDocumentList,
    HiOutlineCube,
    HiOutlineFunnel,
    HiOutlineShoppingCart,
    HiOutlineSquare3Stack3D,
    HiOutlineTruck, // Material Inward quick action hidden below
} from 'react-icons/hi2';
import { MdFilterAltOff } from 'react-icons/md';
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
    { label: 'Inventories', path: '/home', icon: HiOutlineCube },
    { label: 'Purchase Order', path: '/purchase-order', icon: HiOutlineClipboardDocumentList },
    { label: 'Material Inward', path: '/material-inward', icon: HiOutlineTruck },
    { label: 'Finished SKU', path: '/raw-sku', icon: HiOutlineArchiveBox },
    { label: 'BOM', path: '/bom', icon: HiOutlineSquare3Stack3D },
    { label: 'Sales Order', path: '/sales-order', icon: HiOutlineShoppingCart },
];

const FilterBar = ({ fields, values, onChange, onReset, actions, trailingActions, quickActions = defaultQuickActions }: FilterBarProps) => {
    const searchFields = fields.filter((field) => field.type === 'search');
    const otherFields = fields.filter((field) => field.type !== 'search');

    return (
        <div className="filter-bar">
            <div className="filter-bar-quick-actions">
                {quickActions.map((qa) => (
                    <NavLink
                        key={qa.path}
                        to={qa.path}
                        className={({ isActive }) => `filter-bar-quick-action${isActive ? ' filter-bar-quick-action--active' : ''}`}
                    >
                        <qa.icon size={15} />
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
