import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Image } from 'primereact/image';
import { Avatar } from 'primereact/avatar';
import {
    HiOutlineTrash,
    HiOutlineEye,
    HiOutlineCube,
    HiOutlineCheckCircle,
    HiOutlineCheckBadge,
    HiOutlineArrowUturnLeft,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import StatusBadge from '../commonComponents/statusBadge/StatusBadge';
import type { StatusVariant } from '../commonComponents/statusBadge/StatusBadge';
import type { ColumnConfig } from '../commonComponents/dataTable/DataTable';
import { DEFAULT_DATA_TYPE_VALUE } from '../constants/commonConstant';
import { formatDate, type DateFormatOption } from './dateFormat';
import { resolveImageUrl } from './commonFunction';

import type { RawSku } from '../../services/rawSkuService';
import type { Location as LocationType } from '../../services/locationService';
import type { Category as CategoryRecord } from '../../services/categoryService';
import type { ProductType as ProductTypeModel } from '../../services/productTypeService';
import type { Unit as UnitModel } from '../../services/unitService';
import type { Vendor } from '../../services/vendorService';
import type { Customer } from '../../services/customerService';
import type { User } from '../../services/userService';
import type { InventoryItem, AssemblyLine } from '../../services/inventoryService';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, PurchaseOrderPayment } from '../../services/purchaseOrderService';
import type { SalesOrder, SalesOrderItem, SalesOrderStatus, SalesOrderPayment, SalesOrderDispatch } from '../../services/salesOrderService';
import type { MaterialInward, MaterialInwardItem } from '../../services/materialInwardService';
import type { Invoice, PaymentStatus } from '../../services/invoiceService';
import type { Bom, BomItem } from '../../services/bomService';

// Every DataTable column body in the app boils down to a handful of shapes
// (status pill, currency, thumbnail, edit/delete icons, "N items" badge, plain
// text, signed quantity). getRowData() is the single place that resolves both
// what a cell shows and what its hover tooltip says, switching on the column's
// fieldType - one function per row+column, instead of a bespoke `body` arrow
// re-implemented on every page. DataTable.tsx calls getColumnBodyTemplate()
// itself whenever a column carries a `fieldType`, so pages/get*Columns() below
// only ever declare `{ field, header, fieldType, options }` - never `body`.
// Below that, this file also holds one getXColumns() per page's DataTable, so
// the `columns` array itself lives here too instead of inline per page.

export type ColumnBodyType = 'text' | 'status' | 'currency' | 'image' | 'badgeCount' | 'signedQuantity' | 'date' | 'userAvatar';

export interface StatusBodyOptions {
    activeValue?: string;
    variantMap?: Record<string, StatusVariant>;
    defaultVariant?: StatusVariant;
}

export interface CurrencyBodyOptions {
    prefix?: string;
    decimals?: number;
}

export interface ImageBodyOptions<T> {
    altField?: keyof T;
    className?: string;
    preview?: boolean;
}

export interface ActionIconConfig<T> {
    icon: IconType;
    title?: string;
    onClick?: (row: T) => void;
}

export interface ActionBodyOptions<T> {
    onView?: (row: T) => void;
    onDelete?: (row: T) => void;
    icons?: ActionIconConfig<T>[];
}

export interface BadgeCountBodyOptions {
    label: string;
    emptyLabel?: string;
}

export interface SignedQuantityBodyOptions<T> {
    directionField: keyof T;
    positiveColor?: string;
    negativeColor?: string;
}

export interface DateBodyOptions {
    formatOption: DateFormatOption;
}

// "Created By"/"Approved By"/"Recorded By"/"Received By" columns across the app are all plain
// name snapshots taken at creation time (VARCHAR columns, no user ID stored anywhere in the
// DB - see backend/src/db/schema.sql) - there's no foreign key to join back to a specific
// user record. This does a best-effort match by full name against the currently-fetched users
// list, so it can miss or show the wrong photo if a user was since renamed, deleted, or
// happens to share a name with someone else - falls back to plain initials in that case.
export interface UserAvatarBodyOptions {
    users: Pick<User, 'fullName' | 'profileImage'>[];
}

export type FieldTypeOptions<T> =
    | StatusBodyOptions
    | CurrencyBodyOptions
    | ImageBodyOptions<T>
    | BadgeCountBodyOptions
    | SignedQuantityBodyOptions<T>
    | DateBodyOptions
    | UserAvatarBodyOptions;

export type RowDataColumn<T> =
    | { field: keyof T; fieldType: 'text' }
    | { field: keyof T; fieldType: 'status'; options?: StatusBodyOptions }
    | { field: keyof T; fieldType: 'currency'; options?: CurrencyBodyOptions }
    | { field: keyof T; fieldType: 'image'; options?: ImageBodyOptions<T> }
    | { field: keyof T; fieldType: 'badgeCount'; options: BadgeCountBodyOptions }
    | { field: keyof T; fieldType: 'signedQuantity'; options: SignedQuantityBodyOptions<T> }
    | { field: keyof T; fieldType: 'date'; options: DateBodyOptions }
    | { field: keyof T; fieldType: 'userAvatar'; options: UserAvatarBodyOptions };

// -- plain-text resolvers: single source of truth for both the tooltip and, --
// -- where the cell itself is text (currency), the visible content too.    --

function getStatusText<T>(rowData: T, field: keyof T): string {
    return String(rowData[field] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
}

function resolveStatusVariant(value: string, options?: StatusBodyOptions): StatusVariant {
    if (options?.variantMap?.[value]) return options.variantMap[value];
    if (options?.defaultVariant) return options.defaultVariant;
    const activeValue = options?.activeValue ?? 'Active';
    return value === activeValue ? 'success' : 'neutral';
}

function getCurrencyText<T>(rowData: T, field: keyof T, options?: CurrencyBodyOptions): string {
    const prefix = options?.prefix ?? 'Rs. ';
    const decimals = options?.decimals ?? 2;
    const value = Number(rowData[field] ?? DEFAULT_DATA_TYPE_VALUE.ZERO);
    return `${prefix}${value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function getImageAltText<T>(rowData: T, options?: ImageBodyOptions<T>): string {
    return options?.altField ? String(rowData[options.altField] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING) : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING;
}

function getBadgeCountText<T>(rowData: T, field: keyof T, options: BadgeCountBodyOptions): string {
    const value = rowData[field] as unknown;
    const count = Array.isArray(value) ? value.length : Number(value ?? DEFAULT_DATA_TYPE_VALUE.ZERO);
    return count ? `${count} ${options.label}${count > 1 ? 's' : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}` : (options.emptyLabel ?? '—');
}

function getSignedQuantityText<T>(rowData: T, field: keyof T, options: SignedQuantityBodyOptions<T>): string {
    const isPositive = rowData[options.directionField] === 'in';
    return `${isPositive ? '+' : '-'}${String(rowData[field] ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}`;
}

// -- JSX renderers: reuse the text resolvers above so formatting never drifts --
// -- between what the cell shows and what the tooltip says.                  --

function renderStatus<T>(rowData: T, field: keyof T, options?: StatusBodyOptions): ReactNode {
    const value = getStatusText(rowData, field);
    return <StatusBadge label={value} variant={resolveStatusVariant(value, options)} />;
}

function renderImage<T>(rowData: T, field: keyof T, options?: ImageBodyOptions<T>): ReactNode {
    const value = rowData[field] as unknown;
    const src = Array.isArray(value) ? value[0] : value;
    const className = options?.className ?? 'common-table-thumb';

    if (!src) {
        return (
            <div className={`${className} ${className}--placeholder`}>
                <HiOutlineCube size={16} />
            </div>
        );
    }
    const resolvedSrc = resolveImageUrl(src as string);
    if (options?.preview) {
        return <Image src={resolvedSrc} alt={getImageAltText(rowData, options)} imageClassName={className} preview />;
    }
    return <img src={resolvedSrc} alt={getImageAltText(rowData, options)} className={className} />;
}

function renderUserAvatar<T>(rowData: T, field: keyof T, options: UserAvatarBodyOptions): ReactNode {
    const name = String(rowData[field] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    if (!name) return <span>—</span>;
    // See UserAvatarBodyOptions - name match only, no user ID exists to look up reliably.
    const matchedUser = options.users.find((u) => u.fullName === name);
    const photo = matchedUser?.profileImage ? resolveImageUrl(matchedUser.profileImage) : undefined;
    return (
        <span className="common-table-user-cell">
            {/* label is always set (not cleared to undefined just because a photo exists) -
                PrimeReact's Avatar already renders the image when present and falls back to
                the label automatically once the <img> fires onError (imageFallback="default"
                is its own default), but only if there's actually a label value to fall back
                to. Passing undefined here whenever a photo URL exists left nothing to show
                once a broken/stale photo URL failed to load - a blank circle instead of the
                initial. */}
            <Avatar
                label={name.charAt(0).toUpperCase()}
                image={photo}
                shape="circle"
                className="common-table-user-avatar bg-purple-500 text-white"
            />
            <span className="common-table-user-name">{name}</span>
        </span>
    );
}

function renderAction<T>(rowData: T, options: ActionBodyOptions<T>): ReactNode {
    return (
        <div className="data-table-actions">
            {options.onView && <HiOutlineEye size={16} onClick={() => options.onView?.(rowData)} />}
            {options.onDelete && <HiOutlineTrash size={16} color="#dc2626" onClick={() => options.onDelete?.(rowData)} />}
            {options.icons?.map(({ icon: Icon, title, onClick }, index) => (
                <Icon key={index} size={16} title={title} onClick={onClick ? () => onClick(rowData) : undefined} />
            ))}
        </div>
    );
}

function renderBadgeCount<T>(rowData: T, field: keyof T, options: BadgeCountBodyOptions): ReactNode {
    const value = rowData[field] as unknown;
    const count = Array.isArray(value) ? value.length : Number(value ?? DEFAULT_DATA_TYPE_VALUE.ZERO);
    if (!count) {
        return <span className="common-table-badge-count-empty">{options.emptyLabel ?? '—'}</span>;
    }
    return (
        <span className="common-table-badge-count">
            {count} {options.label}{count > 1 ? 's' : DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING}
        </span>
    );
}

function renderSignedQuantity<T>(rowData: T, field: keyof T, options: SignedQuantityBodyOptions<T>): ReactNode {
    const isPositive = rowData[options.directionField] === 'in';
    return (
        <span style={{ color: isPositive ? (options.positiveColor ?? '#16a34a') : (options.negativeColor ?? '#dc2626'), fontWeight: 600 }}>
            {isPositive ? '+' : '-'}{String(rowData[field] ?? DEFAULT_DATA_TYPE_VALUE.ZERO)}
        </span>
    );
}

/**
 * Single reusable body template for a DataTable column + row. Resolves the
 * hover tooltip (getTooltipValue) and the visible cell content (getCellValue)
 * from the same `col` config via a switch on `col.fieldType`, wrapped in a
 * titled <span> so every cell gets a native tooltip for free.
 */
export function getRowData<T>(rowData: T, col: RowDataColumn<T>): ReactNode {
    const getTooltipValue = (): string => {
        switch (col.fieldType) {
            case 'status':
                return getStatusText(rowData, col.field);
            case 'currency':
                return getCurrencyText(rowData, col.field, col.options);
            case 'image':
                return getImageAltText(rowData, col.options);
            case 'badgeCount':
                return getBadgeCountText(rowData, col.field, col.options);
            case 'signedQuantity':
                return getSignedQuantityText(rowData, col.field, col.options);
            case 'date':
                return formatDate(rowData[col.field] as unknown as string, col.options.formatOption);
            case 'userAvatar':
                return String(rowData[col.field] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
            default:
                return String(rowData[col.field] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        }
    };

    const getCellValue = (): ReactNode => {
        switch (col.fieldType) {
            case 'status':
                return renderStatus(rowData, col.field, col.options);
            case 'currency':
                return getCurrencyText(rowData, col.field, col.options);
            case 'image':
                return renderImage(rowData, col.field, col.options);
            case 'badgeCount':
                return renderBadgeCount(rowData, col.field, col.options);
            case 'signedQuantity':
                return renderSignedQuantity(rowData, col.field, col.options);
            case 'date':
                return formatDate(rowData[col.field] as unknown as string, col.options.formatOption);
            case 'userAvatar':
                return renderUserAvatar(rowData, col.field, col.options);
            default:
                return String(rowData[col.field] ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        }
    };

    return (
        <span title={getTooltipValue()}>
            {getCellValue()}
        </span>
    );
}

/**
 * Adapts getRowData() into a `(row: T) => ReactNode` function. DataTable.tsx
 * calls this itself for any column carrying a `fieldType` - pages never call
 * it directly, they just declare `{ field, header, fieldType, options }`.
 */
export function getColumnBodyTemplate<T>(col: RowDataColumn<T>): (row: T) => ReactNode {
    return (row: T) => getRowData(row, col);
}

/**
 * Builds the action body template (edit/delete/view/custom icons) for a page's
 * DataTable. The page passes the result straight to <DataTable actionBodyTemplate={...} />
 * instead of embedding an action column inside its `columns` array.
 */
export function getActionBodyTemplate<T>(options: ActionBodyOptions<T>): (row: T) => ReactNode {
    return (row: T) => renderAction(row, options);
}

// =====================================================================================
// Per-page column definitions. Each page hands over just the callbacks/live data it
// owns; the shape of the `columns` array itself lives here so every table's structure
// is defined in one place instead of re-declared inline on every page. Every column
// carries `fieldType` (+ `options` where needed) - DataTable resolves the actual body
// renderer internally, so no column here ever sets `body` unless the cell is a live
// editable form control (dropdown/number input inside an add/edit dialog), which has
// no generic fieldType equivalent since it's bound to per-row update callbacks.
// =====================================================================================

// 3-tier stock-health classification shared by any "Current Stock" column - at/below
// `lowThreshold` (Reorder Level for Raw SKU, Min Stock for Inventory Home - whichever concept
// that table actually has) is Low, at/above Max Stock is Good, anywhere in between is Medium.
interface StockLevel {
    label: 'Low' | 'Medium' | 'Good';
    color: string;
    bg: string;
}

export const STOCK_LEVEL_LABELS: StockLevel['label'][] = ['Low', 'Medium', 'Good'];

// Rows passed to a table with a stock-health column need this precomputed onto them (as
// `stockLevel`) so its dropdown filter can match against it - PrimeReact filters compare
// against a plain field value, not a value derived at render time from other fields.
export type RawSkuWithStockLevel = RawSku & { stockLevel: StockLevel['label'] };
export type InventoryItemWithStockLevel = InventoryItem & { stockLevel: StockLevel['label'] };

export function getStockLevel(currentStock: number, lowThreshold: number, maxStock: number): StockLevel {
    if (currentStock <= lowThreshold) {
        return { label: 'Low', color: '#dc2626', bg: '#fee2e2' };
    }
    if (maxStock > 0 && currentStock >= maxStock) {
        return { label: 'Good', color: '#16a34a', bg: '#dcfce7' };
    }
    return { label: 'Medium', color: '#d97706', bg: '#fef3c7' };
}

// Shared JSX for a stock-health cell (progress bar with the value centered on top + tier
// badge) - `cellClass` is the page-scoped CSS prefix (e.g. "raw-sku-stock", "inventory-home-
// stock") so each page keeps its own scoped stylesheet per this app's convention, while the
// markup/logic itself isn't duplicated between pages that both need this exact design.
function renderStockCell(currentStock: number, lowThreshold: number, maxStock: number, cellClass: string): ReactNode {
    const level = getStockLevel(currentStock, lowThreshold, maxStock);
    const percent = maxStock > 0 ? Math.min(100, Math.max(0, (currentStock / maxStock) * 100)) : 0;
    return (
        <div className={`${cellClass}-cell`}>
            <div className={`${cellClass}-bar-track`}>
                <div className={`${cellClass}-bar-fill`} style={{ width: `${percent}%`, background: level.bg }} />
                <span className={`${cellClass}-bar-value`} style={{ color: level.color }}>{currentStock.toLocaleString('en-IN')}</span>
            </div>
            <span className={`${cellClass}-badge`} style={{ color: level.color, background: level.bg }}>
                <span className={`${cellClass}-dot`} style={{ background: level.color }} />
                {level.label}
            </span>
        </div>
    );
}

// Shared dropdown filter options for the many tables whose Status column is a plain
// Active/Inactive toggle - keeps the option list (and its ordering) consistent everywhere.
export const ACTIVE_INACTIVE_OPTIONS = ['Active', 'Inactive'];

// Single source of truth for Users' Role/Department options - both the Add/Edit form
// dropdowns (Users.tsx) and this column's filter dropdown import these, so they can never
// drift out of sync with each other.
export const ROLE_OPTIONS = ['Admin', 'Purchase Manager', 'Warehouse Manager', 'Production Manager', 'Sales Manager', 'Sales User', 'Accounts User'];
export const DEPARTMENT_OPTIONS = ['Sales', 'Warehouse', 'Production', 'Accounts', 'Admin'];

export const getRawSkuColumns = (dateFormat: DateFormatOption, onToggleStatus?: (sku: RawSku) => void, onEditClick?: (sku: RawSku) => void): ColumnConfig<RawSkuWithStockLevel>[] => [
    { field: 'images', header: 'Image', filter: false, fieldType: 'image', options: { altField: 'skuName', preview: true } },
    {
        field: 'skuCode',
        header: 'SKU Code',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.skuCode}</span>,
    },
    {
        field: 'skuName',
        header: 'SKU Name',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.skuName}</span>,
    },
    { field: 'categoryName', header: 'Category', fieldType: 'text', hideOnMobile: true },
    { field: 'productTypeName', header: 'Product Type', fieldType: 'text', hideOnMobile: true },
    {
        field: 'currentStock',
        header: 'Current Stock',
        // Filters against the precomputed `stockLevel` field (see RawSkuWithStockLevel),
        // not `currentStock` itself, since the filter picks a tier label - not a number.
        filterField: 'stockLevel',
        filterType: 'dropdown',
        filterOptions: STOCK_LEVEL_LABELS,
        // Progress bar (currentStock as a % of maxStock, value centered on top) + tier badge
        // (see renderStockCell) - lowThreshold here is Reorder Level.
        body: (row) => renderStockCell(row.currentStock, row.reorderLevel, row.maxStock, 'raw-sku-stock'),
        hideOnMobile: true,
    },
    { field: 'unit', header: 'Unit', fieldType: 'text', hideOnMobile: true },
    { field: 'material', header: 'Material', fieldType: 'text', hideOnMobile: true },
    { field: 'locationName', header: 'Location', fieldType: 'text', hideOnMobile: true },
    { field: 'reorderLevel', header: 'Reorder Level', fieldType: 'text', hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    {
        field: 'status',
        header: 'Status',
        filterType: 'dropdown',
        filterOptions: ACTIVE_INACTIVE_OPTIONS,
        body: onToggleStatus
            ? (row) => (
                <InputSwitch
                    className="raw-sku-status-switch"
                    checked={row.status === 'Active'}
                    onChange={() => onToggleStatus(row)}
                />
            )
            : undefined,
        fieldType: 'status',
        hideOnMobile: true,
    },
];

export const getLocationsColumns = (dateFormat: DateFormatOption, onEditClick?: (location: LocationType) => void): ColumnConfig<LocationType>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'location',
        header: 'Location',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.location}</span>,
    },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', filterType: 'dropdown', filterOptions: ACTIVE_INACTIVE_OPTIONS, hideOnMobile: true },
];

export const getCategoryColumns = (dateFormat: DateFormatOption, onEditClick?: (category: CategoryRecord) => void): ColumnConfig<CategoryRecord>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'category',
        header: 'Category',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.category}</span>,
    },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', filterType: 'dropdown', filterOptions: ACTIVE_INACTIVE_OPTIONS, hideOnMobile: true },
];

export const getProductTypeColumns = (dateFormat: DateFormatOption, onEditClick?: (type: ProductTypeModel) => void): ColumnConfig<ProductTypeModel>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'productType',
        header: 'Product Type',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.productType}</span>,
    },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', filterType: 'dropdown', filterOptions: ACTIVE_INACTIVE_OPTIONS, hideOnMobile: true },
];

export const getUnitColumns = (dateFormat: DateFormatOption, onEditClick?: (unit: UnitModel) => void): ColumnConfig<UnitModel>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'unit',
        header: 'Unit',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.unit}</span>,
    },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', filterType: 'dropdown', filterOptions: ACTIVE_INACTIVE_OPTIONS, hideOnMobile: true },
];

export const getVendorColumns = (dateFormat: DateFormatOption, onEditClick?: (vendor: Vendor) => void): ColumnConfig<Vendor>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'vendorName',
        header: 'Vendor Name',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.vendorName}</span>,
    },
    { field: 'email', header: 'Email', fieldType: 'text', hideOnMobile: true },
    { field: 'phoneNumber', header: 'Phone Number', fieldType: 'text', hideOnMobile: true },
    { field: 'address', header: 'Address', fieldType: 'text', hideOnMobile: true },
    { field: 'city', header: 'City', fieldType: 'text', hideOnMobile: true },
    { field: 'zipCode', header: 'Zip Code', fieldType: 'text', hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
];

export const getCustomerColumns = (dateFormat: DateFormatOption, onEditClick?: (customer: Customer) => void): ColumnConfig<Customer>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    {
        field: 'customerName',
        header: 'Customer Name',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.customerName}</span>,
    },
    { field: 'email', header: 'Email', fieldType: 'text', hideOnMobile: true },
    { field: 'phoneNumber', header: 'Phone Number', fieldType: 'text', hideOnMobile: true },
    { field: 'address', header: 'Address', fieldType: 'text', hideOnMobile: true },
    { field: 'city', header: 'City', fieldType: 'text', hideOnMobile: true },
    { field: 'zipCode', header: 'Zip Code', fieldType: 'text', hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
];

export const getUsersColumns = (dateFormat: DateFormatOption, onEditClick?: (user: User) => void): ColumnConfig<User>[] => [
    { field: 'profileImage', header: 'Photo', filter: false, fieldType: 'image', options: { altField: 'fullName', className: 'users-avatar-thumb' }, style: { width: '70px' } },
    {
        field: 'userCode',
        header: 'User Code',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.userCode}</span>,
    },
    {
        field: 'fullName',
        header: 'Name',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.fullName}</span>,
    },
    { field: 'email', header: 'Email', fieldType: 'text', hideOnMobile: true },
    { field: 'phone', header: 'Phone', fieldType: 'text', hideOnMobile: true },
    { field: 'roleId', header: 'Role', fieldType: 'text', filterType: 'dropdown', filterOptions: ROLE_OPTIONS, hideOnMobile: true },
    { field: 'departmentId', header: 'Department', fieldType: 'text', filterType: 'dropdown', filterOptions: DEPARTMENT_OPTIONS, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', filterType: 'dropdown', filterOptions: ACTIVE_INACTIVE_OPTIONS, hideOnMobile: true },
    { field: 'lastLogin', header: 'Last Login', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
];

export const getInventoryHomeColumns = (dateFormat: DateFormatOption, onToggleStatus?: (item: InventoryItem) => void, onEditClick?: (item: InventoryItem) => void): ColumnConfig<InventoryItemWithStockLevel>[] => [
    { field: 'images', header: 'Image', filter: false, fieldType: 'image', options: { altField: 'productName', preview: true, className: 'inventory-home-thumb' } },
    {
        field: 'skuId',
        header: 'SKU (ID)',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.skuId}</span>,
    },
    {
        field: 'productName',
        header: 'Product Name',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.productName}</span>,
    },
    { field: 'categoryName', header: 'Category', fieldType: 'text' },
    { field: 'productType', header: 'Product Type', fieldType: 'text' },
    { field: 'barcode', header: 'Barcode', fieldType: 'text' },
    {
        field: 'quantity',
        header: 'Current Stock',
        // Filters against the precomputed `stockLevel` field (see InventoryItemWithStockLevel),
        // not `quantity` itself, since the filter picks a tier label - not a number.
        filterField: 'stockLevel',
        filterType: 'dropdown',
        filterOptions: STOCK_LEVEL_LABELS,
        // Same design as Raw SKU's Current Stock column (renderStockCell) - lowThreshold
        // here is Min Stock, since Inventory items don't have a separate Reorder Level.
        body: (row) => renderStockCell(row.quantity, row.minStock, row.maxStock, 'inventory-home-stock'),
    },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    {
        field: 'status',
        header: 'Status',
        filterType: 'dropdown',
        filterOptions: ACTIVE_INACTIVE_OPTIONS,
        body: onToggleStatus
            ? (row) => (
                <InputSwitch
                    className="inventory-home-status-switch"
                    checked={row.status === 'Active'}
                    onChange={() => onToggleStatus(row)}
                />
            )
            : undefined,
        fieldType: 'status',
    },
    { field: 'unitCost', header: 'Product Cost', fieldType: 'currency' },
    { field: 'sellingCost', header: 'Selling Cost', fieldType: 'currency' },
    { field: 'createdDate', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'assembly', header: 'Product Assembly', filter: false, fieldType: 'badgeCount', options: { label: 'SKU' } },
];

export interface AssemblyRow extends AssemblyLine {
    rowId: number;
}

export const getInventoryHomeAssemblyColumns = (assemblyRows: AssemblyRow[], skusData: RawSku[], onUpdateRow: (rowId: number, patch: Partial<AssemblyRow>) => void, unitOptions: string[]): ColumnConfig<AssemblyRow>[] => [
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => assemblyRows.findIndex((r) => r.rowId === row.rowId) + 1,
    },
    {
        field: 'skuCode',
        header: 'SKU',
        body: (row) => (
            <Dropdown
                value={row.skuCode || DEFAULT_DATA_TYPE_VALUE.NULL}
                onChange={(e) => {
                    const sku = skusData.find((s) => s.skuCode === e.value);
                    onUpdateRow(row.rowId, {
                        skuCode: e.value,
                        skuName: sku?.skuName ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
                        unit: sku?.unit ?? row.unit,
                    });
                }}
                options={skusData.map((s) => ({ label: `${s.skuCode} - ${s.skuName}`, value: s.skuCode }))}
                placeholder="Select SKU"
                className="inventory-home-assembly-dropdown"
                filter
            />
        ),
    },
    {
        field: 'quantity',
        header: 'Qty Used',
        body: (row) => (
            <InputNumber value={row.quantity} onValueChange={(e) => onUpdateRow(row.rowId, { quantity: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} inputClassName="inventory-home-assembly-qty" />
        ),
    },
    {
        field: 'unit',
        header: 'Unit',
        // Auto-filled from the selected SKU above but independently selectable, in case
        // the component is measured differently in this assembly than its master unit.
        body: (row) => (
            <Dropdown
                value={row.unit || DEFAULT_DATA_TYPE_VALUE.NULL}
                onChange={(e) => onUpdateRow(row.rowId, { unit: e.value })}
                options={unitOptions}
                placeholder="Select unit"
                className="inventory-home-assembly-dropdown"
                filter
            />
        ),
    },
    {
        field: 'skuCode',
        key: 'location',
        header: 'Location',
        // Looked up live from the selected SKU's Raw SKU record (not persisted on the
        // assembly line itself) so it always reflects that SKU's current location,
        // including for rows loaded from an already-saved assembly.
        body: (row) => skusData.find((s) => s.skuCode === row.skuCode)?.locationName ?? '—',
        // The other columns (SKU/Qty Used/Unit) are required inputs for filling out a row -
        // Location is the only purely-informational one, so it's the one curated away on
        // mobile rather than forcing the whole editable grid into a horizontal scroll.
        hideOnMobile: true,
    },
];

export const getMaterialInwardColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users'], onEditClick?: (mi: MaterialInward) => void): ColumnConfig<MaterialInward>[] => [
    {
        field: 'inwardNo',
        header: 'Inward No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.inwardNo}</span>,
    },
    { field: 'receivedDate', header: 'Received Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'vendorName', header: 'Vendor', fieldType: 'text' },
    { field: 'purchaseOrderNo', header: 'PO No.', fieldType: 'text', hideOnMobile: true },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
    { field: 'receivedBy', header: 'Received By', fieldType: 'userAvatar', options: { users }, hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
];

export interface MaterialInwardItemRow extends MaterialInwardItem {
    rowId: number;
}

export const getMaterialInwardItemColumns = (items: MaterialInwardItemRow[], dateFormat: DateFormatOption, onEditClick?: (item: MaterialInwardItemRow) => void): ColumnConfig<MaterialInwardItemRow>[] => [
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => items.findIndex((item) => item.rowId === row.rowId) + 1,
    },
    {
        field: 'itemName',
        header: 'Item Name',
        fieldType: 'text',
        // No dedicated ID column on this line-item grid - Item Name is the closest
        // identifying field, so it takes over the click-to-edit role.
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.itemName}</span>,
    },
    { field: 'orderedQty', header: 'Ordered Qty', fieldType: 'text' },
    { field: 'previousReceivedQty', header: 'Prev. Received', fieldType: 'text' },
    { field: 'receivedQty', header: 'Received Qty', fieldType: 'text' },
    { field: 'pendingQty', header: 'Pending Qty', fieldType: 'text' },
    { field: 'acceptedQty', header: 'Accepted Qty', fieldType: 'text' },
    { field: 'rejectedQty', header: 'Rejected Qty', fieldType: 'text' },
    { field: 'unitPrice', header: 'Unit Price (Rs.)', fieldType: 'currency' },
    { field: 'discountPercent', header: 'Discount %', fieldType: 'text' },
    { field: 'gstPercent', header: 'GST %', fieldType: 'text' },
    { field: 'lineTotal', header: 'Line Total (Rs.)', fieldType: 'currency' },
    { field: 'batchNo', header: 'Batch No.', fieldType: 'text' },
    { field: 'expiryDate', header: 'Expiry Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'remarks', header: 'Remarks', fieldType: 'text' },
];

const paymentStatusVariant: Record<PaymentStatus, StatusVariant> = {
    Unpaid: 'danger',
    Partial: 'warning',
    Paid: 'success',
};

export const getInvoiceColumns = (dateFormat: DateFormatOption, onEditClick?: (invoice: Invoice) => void): ColumnConfig<Invoice>[] => [
    {
        field: 'invoiceNo',
        header: 'Invoice No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.invoiceNo}</span>,
    },
    { field: 'invoiceDate', header: 'Invoice Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'invoiceType', header: 'Type', fieldType: 'status', options: { defaultVariant: 'info' }, filterType: 'dropdown', filterOptions: ['Purchase', 'Sales'], hideOnMobile: true },
    { field: 'customerSupplier', header: 'Customer / Supplier', fieldType: 'text' },
    { field: 'materialInwardNo', header: 'Material Inward No.', fieldType: 'text', hideOnMobile: true },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
    { field: 'paymentStatus', header: 'Payment Status', fieldType: 'status', options: { variantMap: paymentStatusVariant }, filterType: 'dropdown', filterOptions: ['Unpaid', 'Partial', 'Paid'], hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
];

const purchaseOrderStatusVariant: Record<PurchaseOrderStatus, StatusVariant> = {
    Draft: 'neutral',
    Sent: 'info',
    Received: 'success',
    Cancelled: 'danger',
};

export const getPurchaseOrderColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users'], onEditClick?: (po: PurchaseOrder) => void): ColumnConfig<PurchaseOrder>[] => [
    {
        field: 'poNo',
        header: 'PO No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.poNo}</span>,
    },
    { field: 'poDate', header: 'PO Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'vendorName', header: 'Vendor', fieldType: 'text' },
    { field: 'expectedDeliveryDate', header: 'Expected Delivery', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Status', fieldType: 'status', options: { variantMap: purchaseOrderStatusVariant }, filterType: 'dropdown', filterOptions: ['Draft', 'Sent', 'Received', 'Cancelled'], hideOnMobile: true },
    { field: 'createdBy', header: 'Created By', fieldType: 'userAvatar', options: { users }, hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'paymentStatus', header: 'Payment Status', fieldType: 'status', options: { variantMap: paymentStatusVariant }, filterType: 'dropdown', filterOptions: ['Unpaid', 'Partial', 'Paid'], hideOnMobile: true },
    { field: 'paidAmount', header: 'Paid Amount', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
    {
        field: 'paidAmount',
        key: 'remainAmount',
        header: 'Remaining Payment',
        hideOnMobile: true,
        // Always derived (grandTotal - paidAmount), never stored separately - so it can
        // never drift out of sync if either of those two changes.
        body: (row) => `Rs. ${Math.max(row.grandTotal - row.paidAmount, 0).toLocaleString('en-IN')}`,
    },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
];

export interface PurchaseOrderItemRow extends PurchaseOrderItem {
    rowId: number;
}

export const getPurchaseOrderItemColumns = (items: PurchaseOrderItemRow[], onEditClick?: (item: PurchaseOrderItemRow) => void): ColumnConfig<PurchaseOrderItemRow>[] => [
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => items.findIndex((item) => item.rowId === row.rowId) + 1,
    },
    {
        field: 'itemName',
        header: 'Item Name',
        fieldType: 'text',
        // No dedicated ID column on this line-item grid - Item Name is the closest
        // identifying field, so it takes over the click-to-edit role. Plain text (not
        // clickable) when the PO is locked and no edit callback is passed in.
        body: (row) => (onEditClick
            ? <span className="common-table-id-link" onClick={() => onEditClick(row)}>{row.itemName}</span>
            : <span>{row.itemName}</span>),
    },
    { field: 'orderedQty', header: 'Ordered Qty', fieldType: 'text' },
    { field: 'unitPrice', header: 'Unit Price (Rs.)', fieldType: 'currency' },
    { field: 'discountPercent', header: 'Discount %', fieldType: 'text' },
    { field: 'gstPercent', header: 'GST %', fieldType: 'text' },
    { field: 'lineTotal', header: 'Line Total (Rs.)', fieldType: 'currency' },
    { field: 'remarks', header: 'Remarks', fieldType: 'text' },
];

// Transaction History tab (see PurchaseOrderForm.tsx) - one row per Add Payment dialog
// submission. Delete is wired up via the caller's own actionBodyTemplate (getActionBodyTemplate),
// same as getPurchaseOrderItemColumns above, not a column here.
export const getPurchaseOrderPaymentColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users']): ColumnConfig<PurchaseOrderPayment>[] => [
    { field: 'paymentDate', header: 'Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'amount', header: 'Amount (Rs.)', fieldType: 'currency' },
    { field: 'paymentMethod', header: 'Method', fieldType: 'text' },
    { field: 'paymentTerms', header: 'Payment Terms', fieldType: 'text' },
    { field: 'approvedBy', header: 'Approved By', fieldType: 'userAvatar', options: { users } },
    { field: 'approvedAt', header: 'Approved At', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'remarks', header: 'Remarks', fieldType: 'text' },
    { field: 'recordedBy', header: 'Recorded By', fieldType: 'userAvatar', options: { users } },
];

// Transaction History tab (see SalesOrderForm.tsx) - exact mirror of
// getPurchaseOrderPaymentColumns above. Delete is wired up via the caller's own hand-rolled
// action render (same reasoning as PurchaseOrderForm.tsx's paymentActionTemplate - the delete
// handler closes over the `toast` ref, which react-hooks/refs flags if routed through
// getActionBodyTemplate).
export const getSalesOrderPaymentColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users']): ColumnConfig<SalesOrderPayment>[] => [
    { field: 'paymentDate', header: 'Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'amount', header: 'Amount (Rs.)', fieldType: 'currency' },
    { field: 'paymentMethod', header: 'Method', fieldType: 'text' },
    { field: 'paymentTerms', header: 'Payment Terms', fieldType: 'text' },
    { field: 'approvedBy', header: 'Approved By', fieldType: 'userAvatar', options: { users } },
    { field: 'approvedAt', header: 'Approved At', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'remarks', header: 'Remarks', fieldType: 'text' },
    { field: 'recordedBy', header: 'Recorded By', fieldType: 'userAvatar', options: { users } },
];

// One row per Dispatch History entry (see salesOrder.controller.js's dispatchSalesOrder) -
// read-only ledger, no action column (unlike getSalesOrderPaymentColumns, there's no
// add/delete flow for these from the frontend - "Revert Dispatch" undoes the SO's aggregate
// totals in one shot but deliberately never removes rows here, see the schema comment).
export const getSalesOrderDispatchColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users']): ColumnConfig<SalesOrderDispatch>[] => [
    { field: 'dispatchDate', header: 'Date', fieldType: 'date', options: { formatOption: dateFormat } },
    {
        field: 'items',
        header: 'Items Shipped',
        body: (row) => (
            <div className="so-dispatch-history-items">
                {row.items.map((item) => (
                    <span key={item.skuId} className="so-dispatch-history-item">
                        {item.itemName} <strong>&times;{item.shipQty}</strong> {item.unit}
                    </span>
                ))}
            </div>
        ),
    },
    { field: 'dispatchedBy', header: 'Dispatched By', fieldType: 'userAvatar', options: { users } },
];

const salesOrderStatusVariant: Record<SalesOrderStatus, StatusVariant> = {
    Draft: 'neutral',
    Confirmed: 'success',
    Processing: 'info',
    'Partially Shipped': 'warning',
    Dispatched: 'purple',
    Cancelled: 'danger',
};

// Status is a Draft -> Confirmed -> Processing -> (Partially Shipped <-> Dispatched)
// lifecycle with real stock-deduction side effects (see SalesOrder.tsx's dedicated
// Confirm/Process/Dispatch/Revert/Cancel actions) - shown as a plain badge here, same
// reasoning as Bom's Order status column.
export const getSalesOrderColumns = (dateFormat: DateFormatOption, users: UserAvatarBodyOptions['users'], onEditClick?: (so: SalesOrder) => void): ColumnConfig<SalesOrder>[] => [
    {
        field: 'soNo',
        header: 'SO No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.soNo}</span>,
    },
    {
        field: 'customerName',
        header: 'Customer',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.customerName}</span>,
    },
    { field: 'orderDate', header: 'SO Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'deliveryDate', header: 'Expected Delivery', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'status', header: 'Order Status', fieldType: 'status', options: { variantMap: salesOrderStatusVariant }, filterType: 'dropdown', filterOptions: ['Draft', 'Confirmed', 'Processing', 'Partially Shipped', 'Dispatched', 'Cancelled'], hideOnMobile: true },
    { field: 'createdBy', header: 'Created By', fieldType: 'userAvatar', options: { users }, hideOnMobile: true },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
    { field: 'paymentStatus', header: 'Payment Status', fieldType: 'status', options: { variantMap: paymentStatusVariant }, filterType: 'dropdown', filterOptions: ['Unpaid', 'Partial', 'Paid'], hideOnMobile: true },
    { field: 'paidAmount', header: 'Paid Amount', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
    {
        field: 'paidAmount',
        key: 'remainAmount',
        header: 'Remaining Payment',
        hideOnMobile: true,
        // Always derived (grandTotal - paidAmount), never stored separately - so it can
        // never drift out of sync if either of those two changes.
        body: (row) => `Rs. ${Math.max(row.grandTotal - row.paidAmount, 0).toLocaleString('en-IN')}`,
    },
    { field: 'grandTotal', header: 'Grand Total', fieldType: 'currency', options: { decimals: 0 }, hideOnMobile: true },
];

export interface SalesOrderItemRow extends SalesOrderItem {
    rowId: number;
}

export const getSalesOrderItemColumns = (items: SalesOrderItemRow[], inventories: InventoryItem[], onEditClick?: (item: SalesOrderItemRow) => void): ColumnConfig<SalesOrderItemRow>[] => [
    {
        field: 'rowId',
        key: 'image',
        header: 'Image',
        filter: false,
        style: { width: '56px' },
        body: (row) => {
            const src = inventories.find((item) => item.skuId === row.skuId)?.images?.[0];
            if (!src) {
                return (
                    <div className="common-table-thumb common-table-thumb--placeholder">
                        <HiOutlineCube size={16} />
                    </div>
                );
            }
            return <Image src={resolveImageUrl(src)} alt={row.itemName} imageClassName="common-table-thumb" preview />;
        },
    },
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => items.findIndex((item) => item.rowId === row.rowId) + 1,
    },
    {
        field: 'itemName',
        header: 'Item Name',
        fieldType: 'text',
        // No dedicated ID column on this line-item grid - Item Name is the closest
        // identifying field, so it takes over the click-to-edit role. Plain text (not
        // clickable) when the SO is locked and no edit callback is passed in.
        body: (row) => (onEditClick
            ? <span className="common-table-id-link" onClick={() => onEditClick(row)}>{row.itemName}</span>
            : <span>{row.itemName}</span>),
    },
    { field: 'orderedQty', header: 'Ordered Qty', fieldType: 'text' },
    { field: 'dispatchedQty', header: 'Dispatched Qty', fieldType: 'text' },
    { field: 'pendingQty', header: 'Pending Qty', fieldType: 'text' },
    { field: 'unitPrice', header: 'Selling Price (Rs.)', fieldType: 'currency' },
    { field: 'discountPercent', header: 'Discount %', fieldType: 'text' },
    { field: 'gstPercent', header: 'GST %', fieldType: 'text' },
    { field: 'lineTotal', header: 'Line Total (Rs.)', fieldType: 'currency' },
];

// A BOM no longer has one shared Output Product/Qty of its own - it's just a code plus a
// list of Inventory items to produce, each completed independently (see Bom.tsx's expandable
// row + per-item Complete/Revert). "status" here is server-derived from every item's own
// status (bom.controller.js's computeBomStatus): Process (nothing done yet) / Partially
// Completed (some items done) / Completed (every item done).
// `getLabel` resolves a column's header through Developer Admin's built-in-field label
// overrides (see useFieldLabels.ts) - defaults to the hardcoded string here when the caller
// doesn't pass one (or hasn't wired this form up to the label-override feature yet), so every
// existing call site keeps working unchanged.
export const getBomColumns = (
    dateFormat: DateFormatOption,
    onEditClick?: (bom: Bom) => void,
    getLabel: (fieldKey: string, defaultLabel: string) => string = (_key, defaultLabel) => defaultLabel
): ColumnConfig<Bom>[] => [
        {
            field: 'bomCode',
            header: getLabel('bomCode', 'BOM Code'),
            fieldType: 'text',
            // Always clickable to open the dialog - unlike the old single-Output-Product BOM,
            // there's no "locked once Completed" state at the whole-BOM level anymore: new
            // Pending items can always be added, only individually-Completed items within it
            // are protected from editing (see bom.controller.js's updateBom).
            body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.bomCode}</span>,
        },
        {
            field: 'items',
            key: 'totalQty',
            header: getLabel('totalQty', 'Total Qty'),
            filter: false,
            // Sum of every item's own requiredQty - the closest single "how much is this BOM
            // worth" number now that there's no shared Output Qty of its own.
            body: (row) => row.items.reduce((sum, item) => sum + item.requiredQty, 0),
        },
        {
            field: 'items',
            key: 'completedQty',
            header: getLabel('completedQty', 'Completed Qty'),
            filter: false,
            hideOnMobile: true,
            body: (row) => row.items.filter((item) => item.status === 'Completed').reduce((sum, item) => sum + item.requiredQty, 0),
        },
        {
            field: 'items',
            key: 'pendingQty',
            header: getLabel('pendingQty', 'Pending Qty'),
            filter: false,
            hideOnMobile: true,
            body: (row) => row.items.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + item.requiredQty, 0),
        },
        { field: 'items', header: getLabel('items', 'Items'), key: 'itemCount', filter: false, fieldType: 'badgeCount', options: { label: 'SKU' }, hideOnMobile: true },
        { field: 'createdAt', header: getLabel('createdAt', 'Created Date'), fieldType: 'date', options: { formatOption: dateFormat }, hideOnMobile: true },
        {
            field: 'status',
            header: getLabel('status', 'Status'),
            fieldType: 'status',
            options: { variantMap: { Process: 'info', 'Partially Completed': 'warning', Completed: 'success' } },
            filterType: 'dropdown',
            filterOptions: ['Process', 'Partially Completed', 'Completed'],
        },
    ];

export interface BomItemRow extends BomItem {
    rowId: number;
}

// Items are Main Inventory items - manually added/removed one at a time in the Add/Edit BOM
// dialog while composing a BOM (see Bom.tsx's Add Item row), each independently completed
// later from the main list's expandable row (getBomItemExpansionColumns below), not here.
// Location/stock are looked up live from `inventories` (not stored on the item) so they
// always reflect that item's current Inventory record rather than a frozen snapshot from
// whenever the BOM was composed.
export const getBomItemColumns = (items: BomItemRow[], inventories: InventoryItem[], rawSkus: RawSku[]): ColumnConfig<BomItemRow>[] => [
    {
        field: 'rowId',
        key: 'image',
        header: 'Image',
        filter: false,
        style: { width: '56px' },
        body: (row) => {
            const src = inventories.find((inv) => inv.skuId === row.skuId)?.images?.[0];
            if (!src) {
                return (
                    <div className="common-table-thumb common-table-thumb--placeholder">
                        <HiOutlineCube size={16} />
                    </div>
                );
            }
            return <Image src={resolveImageUrl(src)} alt={row.productName} imageClassName="common-table-thumb" preview />;
        },
    },
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => items.findIndex((item) => item.rowId === row.rowId) + 1,
    },
    {
        field: 'skuId',
        header: 'Item',
        body: (row) => <span>{row.skuId} - {row.productName}</span>,
    },
    {
        field: 'skuId',
        key: 'location',
        header: 'Location',
        body: (row) => inventories.find((inv) => inv.skuId === row.skuId)?.locationName || '—',
    },
    {
        field: 'skuId',
        key: 'currentStock',
        header: 'Current Qty',
        // The item's own live Inventory stock, shown for context - before this BOM's line
        // for it is completed, this is how much of it already exists in Inventory.
        body: (row) => {
            const stock = inventories.find((inv) => inv.skuId === row.skuId);
            return stock ? `${stock.quantity} ${stock.unit}` : '—';
        },
    },
    {
        field: 'requiredQty',
        key: 'requiredQty',
        header: 'Required Qty',
        // Shown as a badge (leading icon + background tint) - red when producing this much of
        // the item would need more of some Raw SKU (from its own Product Assembly) than
        // currently exists in stock, green when every Raw SKU line covers it. This is the
        // real constraint completing this line later checks server-side (see
        // bom.controller.js's completeBomItem) - NOT the Inventory item's own current stock,
        // which has no bearing on whether more of it can be produced.
        body: (row) => {
            const component = inventories.find((inv) => inv.skuId === row.skuId);
            const assembly = component?.assembly ?? [];
            const shortfall = assembly.find((line) => {
                const needed = line.quantity * row.requiredQty;
                const available = rawSkus.find((sku) => sku.skuCode === line.skuCode)?.currentStock ?? 0;
                return needed > available;
            });
            const insufficient = Boolean(shortfall);
            const sufficient = assembly.length > 0 && !insufficient;
            const statusClass = insufficient ? ' bom-item-qty-needed--insufficient' : sufficient ? ' bom-item-qty-needed--sufficient' : '';
            return (
                <span
                    className={`bom-item-qty-needed${statusClass}`}
                    title={insufficient ? `Not enough ${shortfall!.skuName} in stock` : undefined}
                >
                    {insufficient && <HiOutlineExclamationTriangle size={13} className="bom-item-qty-needed-icon" />}
                    {sufficient && <HiOutlineCheckCircle size={13} className="bom-item-qty-needed-icon" />}
                    {row.requiredQty} {row.unit}
                </span>
            );
        },
    },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    {
        field: 'status',
        header: 'Status',
        fieldType: 'status',
        options: { variantMap: { Pending: 'warning', Completed: 'success' } },
    },
];

// Main BOM list's expandable-row content - every item in that BOM, each with its own
// Complete/Revert action (onComplete/onRevert), independent of every other item in the same
// BOM. Separate from getBomItemColumns above (used inside the Add/Edit dialog while composing
// a BOM, where there's no complete/revert action - only add/remove of still-Pending lines).
export const getBomItemExpansionColumns = (
    inventories: InventoryItem[],
    onComplete: (item: BomItem) => void,
    onRevert: (item: BomItem) => void
): ColumnConfig<BomItem>[] => [
        {
            field: 'skuId',
            key: 'action',
            header: 'Action',
            filter: false,
            style: { width: '64px' },
            // Icon-only Button (not a bare clickable icon) - same boxed square look as the
            // page toolbar's own Refresh button (see FilterBar.css's .filter-bar-refresh-btn),
            // reused here via .bom-item-action-btn so this row action reads as a real button.
            body: (row) => (
                <div className="data-table-actions">
                    {row.status === 'Pending' ? (
                        <Button
                            className="bom-item-action-btn bom-item-action-btn--complete"
                            icon={<HiOutlineCheckBadge size={20} />}
                            outlined
                            size="small"
                            onClick={() => onComplete(row)}
                            aria-label="Mark as Completed"
                            title="Mark as Completed"
                        />
                    ) : (
                        <Button
                            className="bom-item-action-btn"
                            icon={<HiOutlineArrowUturnLeft size={20} />}
                            outlined
                            size="small"
                            onClick={() => onRevert(row)}
                            aria-label="Revert to Pending"
                            title="Revert to Pending"
                        />
                    )}
                </div>
            ),
        },
        {
            field: 'skuId',
            key: 'image',
            header: 'Image',
            filter: false,
            style: { width: '56px' },
            body: (row) => {
                const src = inventories.find((inv) => inv.skuId === row.skuId)?.images?.[0];
                if (!src) {
                    return (
                        <div className="common-table-thumb common-table-thumb--placeholder">
                            <HiOutlineCube size={16} />
                        </div>
                    );
                }
                return <Image src={resolveImageUrl(src)} alt={row.productName} imageClassName="common-table-thumb" preview />;
            },
        },
        { field: 'skuId', header: 'Item', body: (row) => <span>{row.skuId} - {row.productName}</span> },
        {
            field: 'skuId',
            key: 'location',
            header: 'Location',
            filter: false,
            body: (row) => inventories.find((inv) => inv.skuId === row.skuId)?.locationName || '—',
        },
        {
            field: 'skuId',
            key: 'currentStock',
            header: 'Current Qty',
            filter: false,
            // The item's own live Inventory stock, shown for context alongside how much of it
            // this line still needs to produce.
            body: (row) => {
                const stock = inventories.find((inv) => inv.skuId === row.skuId);
                return stock ? `${stock.quantity} ${stock.unit}` : '—';
            },
        },
        { field: 'requiredQty', header: 'Qty', fieldType: 'text' },
        { field: 'unit', header: 'Unit', fieldType: 'text' },
        {
            field: 'status',
            header: 'Status',
            fieldType: 'status',
            options: { variantMap: { Pending: 'warning', Completed: 'success' } },
        },
    ];
