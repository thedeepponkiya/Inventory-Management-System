import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Image } from 'primereact/image';
import {
    HiOutlineTrash,
    HiOutlineEye,
    HiOutlineCube,
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
import type { User } from '../../services/userService';
import type { InventoryItem, AssemblyLine } from '../../services/inventoryService';
import type { Transaction, TransactionType } from '../../mockData/transactionData';
import type { RecentReport } from '../../mockData/reportData';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../../services/purchaseOrderService';
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

export type ColumnBodyType = 'text' | 'status' | 'currency' | 'image' | 'badgeCount' | 'signedQuantity' | 'date';

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

export type FieldTypeOptions<T> =
    | StatusBodyOptions
    | CurrencyBodyOptions
    | ImageBodyOptions<T>
    | BadgeCountBodyOptions
    | SignedQuantityBodyOptions<T>
    | DateBodyOptions;

export type RowDataColumn<T> =
    | { field: keyof T; fieldType: 'text' }
    | { field: keyof T; fieldType: 'status'; options?: StatusBodyOptions }
    | { field: keyof T; fieldType: 'currency'; options?: CurrencyBodyOptions }
    | { field: keyof T; fieldType: 'image'; options?: ImageBodyOptions<T> }
    | { field: keyof T; fieldType: 'badgeCount'; options: BadgeCountBodyOptions }
    | { field: keyof T; fieldType: 'signedQuantity'; options: SignedQuantityBodyOptions<T> }
    | { field: keyof T; fieldType: 'date'; options: DateBodyOptions };

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

export const getRawSkuColumns = (dateFormat: DateFormatOption, onToggleStatus?: (sku: RawSku) => void, onEditClick?: (sku: RawSku) => void): ColumnConfig<RawSku>[] => [
    {
        field: 'skuCode',
        header: 'SKU Code',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.skuCode}</span>,
    },
    { field: 'skuName', header: 'SKU Name', fieldType: 'text' },
    { field: 'categoryName', header: 'Category', fieldType: 'text' },
    { field: 'productTypeName', header: 'Product Type', fieldType: 'text' },
    {
        field: 'currentStock',
        header: 'Current Stock',
        // At/below Min Stock = critical (red), at/above Max Stock = healthy (green),
        // anywhere in between = watch (orange) - the value's own text is bolded and
        // colored, on a matching tinted pill background, rather than using a separate
        // dot/badge marker.
        body: (row) => {
            const tone = row.currentStock <= row.minStock
                ? 'danger'
                : row.currentStock >= row.maxStock
                    ? 'success'
                    : 'warning';
            return (
                <span
                    style={{
                        fontWeight: 700,
                        color: `var(--accent-${tone}-text)`,
                        backgroundColor: `var(--accent-${tone}-bg)`,
                        padding: '2px 10px',
                        borderRadius: '999px',
                        display: 'inline-block',
                    }}
                >
                    {row.currentStock}
                </span>
            );
        },
    },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    { field: 'reorderLevel', header: 'Reorder Level', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    {
        field: 'status',
        header: 'Status',
        filter: false,
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
    { field: 'location', header: 'Location', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getCategoryColumns = (dateFormat: DateFormatOption, onEditClick?: (category: CategoryRecord) => void): ColumnConfig<CategoryRecord>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    { field: 'category', header: 'Category', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getProductTypeColumns = (dateFormat: DateFormatOption, onEditClick?: (type: ProductTypeModel) => void): ColumnConfig<ProductTypeModel>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    { field: 'productType', header: 'Product Type', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getUnitColumns = (dateFormat: DateFormatOption, onEditClick?: (unit: UnitModel) => void): ColumnConfig<UnitModel>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getVendorColumns = (dateFormat: DateFormatOption, onEditClick?: (vendor: Vendor) => void): ColumnConfig<Vendor>[] => [
    {
        field: 'id',
        header: 'ID',
        fieldType: 'text',
        style: { width: '70px' },
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.id}</span>,
    },
    { field: 'vendorName', header: 'Vendor Name', fieldType: 'text' },
    { field: 'email', header: 'Email', fieldType: 'text' },
    { field: 'phoneNumber', header: 'Phone Number', fieldType: 'text' },
    { field: 'address', header: 'Address', fieldType: 'text' },
    { field: 'city', header: 'City', fieldType: 'text' },
    { field: 'zipCode', header: 'Zip Code', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
];

export const getUsersColumns = (dateFormat: DateFormatOption, onEditClick?: (user: User) => void): ColumnConfig<User>[] => [
    { field: 'profileImage', header: 'Photo', filter: false, fieldType: 'image', options: { altField: 'fullName', className: 'users-avatar-thumb' }, style: { width: '70px' } },
    {
        field: 'userCode',
        header: 'User Code',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>{row.userCode}</span>,
    },
    { field: 'fullName', header: 'Name', fieldType: 'text' },
    { field: 'email', header: 'Email', fieldType: 'text' },
    { field: 'phone', header: 'Phone', fieldType: 'text' },
    { field: 'roleId', header: 'Role', fieldType: 'text' },
    { field: 'departmentId', header: 'Department', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
    { field: 'lastLogin', header: 'Last Login', fieldType: 'date', options: { formatOption: dateFormat } },
];

export const getInventoryHomeColumns = (dateFormat: DateFormatOption, onToggleStatus?: (item: InventoryItem) => void, onEditClick?: (item: InventoryItem) => void): ColumnConfig<InventoryItem>[] => [
    { field: 'images', header: 'Image', filter: false, fieldType: 'image', options: { altField: 'productName', preview: true } },
    {
        field: 'skuId',
        header: 'SKU (ID)',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.skuId}</span>,
    },
    { field: 'productName', header: 'Product Name', fieldType: 'text' },
    { field: 'categoryName', header: 'Category', fieldType: 'text' },
    { field: 'productType', header: 'Product Type', fieldType: 'text' },
    { field: 'barcode', header: 'Barcode', fieldType: 'text' },
    { field: 'quantity', header: 'Quantity', fieldType: 'text' },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    {
        field: 'status',
        header: 'Status',
        filter: false,
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
    { field: 'unitCost', header: 'Unit Cost (Rs.)', fieldType: 'currency' },
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
    },
];

export const getMaterialInwardColumns = (dateFormat: DateFormatOption, onEditClick?: (mi: MaterialInward) => void): ColumnConfig<MaterialInward>[] => [
    {
        field: 'inwardNo',
        header: 'Inward No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.inwardNo}</span>,
    },
    { field: 'receivedDate', header: 'Received Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'vendorName', header: 'Vendor', fieldType: 'text' },
    { field: 'purchaseOrderNo', header: 'PO No.', fieldType: 'text' },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 } },
    { field: 'receivedBy', header: 'Received By', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
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

const transactionTypeVariant: Record<TransactionType, StatusVariant> = {
    'Material Inward': 'info',
    'Issue Kit': 'warning',
    Transfer: 'success',
    Return: 'danger',
};

export const getTransactionsColumns = (): ColumnConfig<Transaction>[] => [
    { field: 'dateTime', header: 'Date & Time', fieldType: 'text' },
    { field: 'type', header: 'Transaction Type', fieldType: 'status', options: { variantMap: transactionTypeVariant } },
    { field: 'referenceNo', header: 'Reference No.', fieldType: 'text' },
    { field: 'itemType', header: 'Item Type', fieldType: 'text' },
    { field: 'itemName', header: 'Item / Kit Name', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    { field: 'quantity', header: 'Quantity', fieldType: 'signedQuantity', options: { directionField: 'direction' } },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'createdBy', header: 'Created By', fieldType: 'text' },
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
    { field: 'invoiceType', header: 'Type', fieldType: 'status', options: { defaultVariant: 'info' } },
    { field: 'customerSupplier', header: 'Customer / Supplier', fieldType: 'text' },
    { field: 'materialInwardNo', header: 'Material Inward No.', fieldType: 'text' },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 } },
    { field: 'paymentStatus', header: 'Payment Status', fieldType: 'status', options: { variantMap: paymentStatusVariant } },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
];

const purchaseOrderStatusVariant: Record<PurchaseOrderStatus, StatusVariant> = {
    Draft: 'neutral',
    Sent: 'info',
    Received: 'success',
    Cancelled: 'danger',
};

export const getPurchaseOrderColumns = (dateFormat: DateFormatOption, onEditClick?: (po: PurchaseOrder) => void): ColumnConfig<PurchaseOrder>[] => [
    {
        field: 'poNo',
        header: 'PO No.',
        fieldType: 'text',
        body: (row) => <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.poNo}</span>,
    },
    { field: 'poDate', header: 'PO Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'vendorName', header: 'Vendor', fieldType: 'text' },
    { field: 'expectedDeliveryDate', header: 'Expected Delivery', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status', options: { variantMap: purchaseOrderStatusVariant } },
    { field: 'grandTotal', header: 'Grand Total (Rs.)', fieldType: 'currency', options: { decimals: 0 } },
    { field: 'createdBy', header: 'Created By', fieldType: 'text' },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
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

// Status is a Process -> Dispatch order lifecycle now (not a simple Active/Inactive
// toggle), so it's shown as a plain badge here - the transition itself only happens via
// the dedicated Dispatch/Revert actions in Bom.tsx (each has real stock-deduction side
// effects, so it's deliberately not a one-click switch).
export const getBomColumns = (dateFormat: DateFormatOption, onEditClick?: (bom: Bom) => void): ColumnConfig<Bom>[] => [
    {
        field: 'bomCode',
        header: 'Order Code',
        fieldType: 'text',
        // Only clickable while Process - editing a Dispatch order is blocked the same way
        // the old pencil icon was hidden for Dispatch status (see Bom.tsx's action column).
        body: (row) => (row.status === 'Process'
            ? <span className="common-table-id-link" onClick={() => onEditClick?.(row)}>#{row.bomCode}</span>
            : <span>#{row.bomCode}</span>),
    },
    { field: 'productSku', header: 'Product SKU', fieldType: 'text' },
    { field: 'productName', header: 'Product Name', fieldType: 'text' },
    { field: 'outputQty', header: 'Output Qty', fieldType: 'text' },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'items', header: 'Components', filter: false, fieldType: 'badgeCount', options: { label: 'SKU' } },
    { field: 'createdAt', header: 'Created Date', fieldType: 'date', options: { formatOption: dateFormat } },
    { field: 'status', header: 'Status', fieldType: 'status', options: { variantMap: { Process: 'info', Dispatch: 'success' } } },
];

export interface BomItemRow extends BomItem {
    rowId: number;
}

// Read-only: BOM Components are always auto-populated from the selected Product's own
// Product Assembly (see Bom.tsx's Product dropdown) - there is no manual add/edit/delete
// of rows, just a display of whichever SKUs came from that product's assembly. Location is
// looked up live from rawSkus (not stored on the item) so it always reflects the Raw SKU's
// current location rather than a frozen snapshot from whenever the order was created.
export const getBomItemColumns = (items: BomItemRow[], outputQty: number, rawSkus: RawSku[]): ColumnConfig<BomItemRow>[] => [
    {
        field: 'rowId',
        key: 'index',
        header: '#',
        style: { width: '44px' },
        body: (row) => items.findIndex((item) => item.rowId === row.rowId) + 1,
    },
    {
        field: 'rawSkuCode',
        header: 'Finished SKU',
        body: (row) => `${row.rawSkuCode} - ${row.rawSkuName}`,
    },
    {
        field: 'rawSkuCode',
        key: 'location',
        header: 'Location',
        body: (row) => rawSkus.find((sku) => sku.skuCode === row.rawSkuCode)?.locationName || '—',
    },
    { field: 'requiredQty', header: 'Required Qty', fieldType: 'text' },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    {
        field: 'requiredQty',
        key: 'qtyNeeded',
        header: 'Qty Needed',
        // Scaled for the BOM's current Output Qty - preview-only, never persisted (see
        // ims_bom's schema comment in schema.sql). Flagged red when it exceeds the Raw
        // SKU's current stock, since dispatching this order later would need more than is
        // actually available.
        body: (row) => {
            const needed = row.requiredQty * outputQty;
            const stock = rawSkus.find((sku) => sku.skuCode === row.rawSkuCode);
            const insufficient = Boolean(stock) && needed > stock!.currentStock;
            return (
                <span
                    className={`bom-item-qty-needed${insufficient ? ' bom-item-qty-needed--insufficient' : ''}`}
                    title={insufficient ? `Only ${stock!.currentStock} ${row.unit} in stock` : undefined}
                >
                    {Number.isFinite(needed) ? Number(needed.toFixed(2)) : 0} {row.unit}
                    {insufficient && <HiOutlineExclamationTriangle size={13} className="bom-item-qty-needed-icon" />}
                </span>
            );
        },
    },
];

export const getReportsColumns = (): ColumnConfig<RecentReport>[] => [
    { field: 'name', header: 'Report Name', fieldType: 'text' },
    { field: 'type', header: 'Report Type', fieldType: 'status', options: { defaultVariant: 'info' } },
    { field: 'generatedOn', header: 'Generated On', fieldType: 'text' },
    { field: 'generatedBy', header: 'Generated By', fieldType: 'text' },
    { field: 'format', header: 'Format', fieldType: 'status', options: { variantMap: { PDF: 'danger', Excel: 'success' } } },
];
