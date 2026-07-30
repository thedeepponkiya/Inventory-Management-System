import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import {
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineEye,
    HiOutlineCube,
} from 'react-icons/hi2';
import StatusBadge from '../commonComponents/statusBadge/StatusBadge';
import type { StatusVariant } from '../commonComponents/statusBadge/StatusBadge';
import type { ColumnConfig } from '../commonComponents/dataTable/DataTable';
import { DEFAULT_DATA_TYPE_VALUE } from '../constants/commonConstant';

import type { Sku } from '../../mockData/skuData';
import type { Location as LocationType } from '../../services/locationService';
import type { Category as CategoryRecord } from '../../services/categoryService';
import type { Category as CategoryType } from '../../mockData/categoryData';
import type { ProductType as ProductTypeModel } from '../../services/productTypeService';
import type { Vendor } from '../../services/vendorService';
import type { User } from '../../mockData/userData';
import type { InventoryItem, AssemblyLine } from '../../mockData/inventoryHomeData';
import type { RecentInward } from '../../mockData/materialInwardData';
import type { Transaction, TransactionType } from '../../mockData/transactionData';
import type { Invoice, InvoiceStatus } from '../../mockData/invoiceData';
import type { RecentReport } from '../../mockData/reportData';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../mockData/purchaseOrderData';

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

export type ColumnBodyType = 'text' | 'status' | 'currency' | 'image' | 'badgeCount' | 'signedQuantity';

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
}

export interface ActionIconConfig<T> {
    icon: IconType;
    title?: string;
    onClick?: (row: T) => void;
}

export interface ActionBodyOptions<T> {
    onView?: (row: T) => void;
    onEdit?: (row: T) => void;
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

export type FieldTypeOptions<T> =
    | StatusBodyOptions
    | CurrencyBodyOptions
    | ImageBodyOptions<T>
    | BadgeCountBodyOptions
    | SignedQuantityBodyOptions<T>;

export type RowDataColumn<T> =
    | { field: keyof T; fieldType: 'text' }
    | { field: keyof T; fieldType: 'status'; options?: StatusBodyOptions }
    | { field: keyof T; fieldType: 'currency'; options?: CurrencyBodyOptions }
    | { field: keyof T; fieldType: 'image'; options?: ImageBodyOptions<T> }
    | { field: keyof T; fieldType: 'badgeCount'; options: BadgeCountBodyOptions }
    | { field: keyof T; fieldType: 'signedQuantity'; options: SignedQuantityBodyOptions<T> };

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
    return <img src={src as string} alt={getImageAltText(rowData, options)} className={className} />;
}

function renderAction<T>(rowData: T, options: ActionBodyOptions<T>): ReactNode {
    return (
        <div className="data-table-actions">
            {options.onView && <HiOutlineEye size={16} onClick={() => options.onView?.(rowData)} />}
            {options.onEdit && <HiOutlinePencilSquare size={16} onClick={() => options.onEdit?.(rowData)} />}
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

export const getRawSkuColumns = (): ColumnConfig<Sku>[] => [
    { field: 'code', header: 'SKU Code', fieldType: 'text' },
    { field: 'name', header: 'SKU Name', fieldType: 'text' },
    { field: 'categoryName', header: 'Category (Box)', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'currentStock', header: 'Current Stock', fieldType: 'text' },
    { field: 'unitPrice', header: 'Unit Price (Rs.)', fieldType: 'currency' },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getLocationsColumns = (): ColumnConfig<LocationType>[] => [
    { field: 'id', header: 'ID', fieldType: 'text', style: { width: '70px' } },
    { field: 'location', header: 'Location', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getCategoryColumns = (): ColumnConfig<CategoryRecord>[] => [
    { field: 'id', header: 'ID', fieldType: 'text', style: { width: '70px' } },
    { field: 'category', header: 'Category', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getProductTypeColumns = (): ColumnConfig<ProductTypeModel>[] => [
    { field: 'id', header: 'ID', fieldType: 'text', style: { width: '70px' } },
    { field: 'productType', header: 'Product Type', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getVendorColumns = (): ColumnConfig<Vendor>[] => [
    { field: 'id', header: 'ID', fieldType: 'text', style: { width: '70px' } },
    { field: 'vendorName', header: 'Vendor Name', fieldType: 'text' },
    { field: 'email', header: 'Email', fieldType: 'text' },
    { field: 'phoneNumber', header: 'Phone Number', fieldType: 'text' },
    { field: 'address', header: 'Address', fieldType: 'text' },
    { field: 'city', header: 'City', fieldType: 'text' },
    { field: 'zipCode', header: 'Zip Code', fieldType: 'text' },
];

export const getUsersColumns = (): ColumnConfig<User>[] => [
    { field: 'name', header: 'Name', fieldType: 'text' },
    { field: 'email', header: 'Email', fieldType: 'text' },
    { field: 'role', header: 'Role', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
];

export const getInventoryHomeColumns = (): ColumnConfig<InventoryItem>[] => [
    { field: 'images', header: 'Image', filter: false, fieldType: 'image', options: { altField: 'productName' } },
    { field: 'skuId', header: 'SKU (ID)', fieldType: 'text' },
    { field: 'productName', header: 'Product Name', fieldType: 'text' },
    { field: 'categoryName', header: 'Category', fieldType: 'text' },
    { field: 'productType', header: 'Product Type', fieldType: 'text' },
    { field: 'barcode', header: 'Barcode', fieldType: 'text' },
    { field: 'quantity', header: 'Quantity', fieldType: 'text' },
    { field: 'unit', header: 'Unit', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    { field: 'status', header: 'Status', fieldType: 'status' },
    { field: 'unitCost', header: 'Unit Cost (Rs.)', fieldType: 'currency' },
    { field: 'createdDate', header: 'Created Date', fieldType: 'text' },
    { field: 'assembly', header: 'Product Assembly', filter: false, fieldType: 'badgeCount', options: { label: 'SKU' } },
];

export interface AssemblyRow extends AssemblyLine {
    rowId: number;
}

export const getInventoryHomeAssemblyColumns = (assemblyRows: AssemblyRow[], skusData: Sku[], onUpdateRow: (rowId: number, patch: Partial<AssemblyRow>) => void): ColumnConfig<AssemblyRow>[] => [
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
                    const sku = skusData.find((s) => s.code === e.value);
                    onUpdateRow(row.rowId, { skuCode: e.value, skuName: sku?.name ?? DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING });
                }}
                options={skusData.map((s) => ({ label: `${s.code} - ${s.name}`, value: s.code }))}
                placeholder="Select SKU"
                className="inventory-home-assembly-dropdown"
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
];

export interface InwardItem {
    id: number;
    categoryName: string | null;
    skuCode: string | null;
    batchNo: string;
    qty: number;
    unitPrice: number;
}

export const getMaterialInwardItemColumns = (items: InwardItem[], categoriesData: CategoryType[], skusData: Sku[], onUpdateItem: (id: number, patch: Partial<InwardItem>) => void): ColumnConfig<InwardItem>[] => [
    {
        field: 'id',
        key: 'index',
        header: '#',
        style: { width: '48px' },
        body: (row) => items.findIndex((item) => item.id === row.id) + 1,
    },
    {
        field: 'categoryName',
        header: 'Category (Box)',
        body: (row) => (
            <Dropdown
                value={row.categoryName}
                onChange={(e) => onUpdateItem(row.id, { categoryName: e.value, skuCode: DEFAULT_DATA_TYPE_VALUE.NULL })}
                options={categoriesData.map((c) => c.name)}
                placeholder="Category"
                className="inward-items-dropdown"
            />
        ),
    },
    {
        field: 'skuCode',
        header: 'SKU / Item',
        body: (row) => (
            <Dropdown
                value={row.skuCode}
                onChange={(e) => onUpdateItem(row.id, { skuCode: e.value })}
                options={skusData
                    .filter((s) => !row.categoryName || s.categoryName === row.categoryName)
                    .map((s) => ({ label: s.name, value: s.code }))}
                placeholder="SKU / Item"
                className="inward-items-dropdown"
            />
        ),
    },
    {
        field: 'batchNo',
        header: 'Batch No.',
        body: (row) => (
            <InputText value={row.batchNo} onChange={(e) => onUpdateItem(row.id, { batchNo: e.target.value })} placeholder="Batch no." />
        ),
    },
    {
        field: 'qty',
        header: 'Qty',
        body: (row) => (
            <InputNumber value={row.qty} onValueChange={(e) => onUpdateItem(row.id, { qty: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })} inputClassName="inward-items-number" />
        ),
    },
    {
        field: 'unitPrice',
        header: 'Unit Price (Rs.)',
        body: (row) => (
            <InputNumber
                value={row.unitPrice}
                onValueChange={(e) => onUpdateItem(row.id, { unitPrice: e.value ?? DEFAULT_DATA_TYPE_VALUE.ZERO })}
                mode="decimal"
                minFractionDigits={2}
                inputClassName="inward-items-number"
            />
        ),
    },
    {
        field: 'unitPrice',
        key: 'total',
        header: 'Total (Rs.)',
        body: (row) => (row.qty * row.unitPrice).toFixed(2),
    },
];

const inwardPaymentStatusVariant: Record<string, StatusVariant> = {
    Paid: 'success',
    Unpaid: 'warning',
};

export const getMaterialInwardInwardColumns = (): ColumnConfig<RecentInward>[] => [
    { field: 'invoiceNo', header: 'Invoice No.', fieldType: 'text' },
    { field: 'date', header: 'Date', fieldType: 'text' },
    { field: 'amount', header: 'Amount (Rs.)', fieldType: 'currency', options: { decimals: 0 } },
    { field: 'paymentStatus', header: 'Payment Status', fieldType: 'status', options: { variantMap: inwardPaymentStatusVariant } },
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

const invoiceStatusVariant: Record<InvoiceStatus, StatusVariant> = {
    Paid: 'success',
    Partial: 'warning',
    Overdue: 'danger',
    Pending: 'warning',
    Draft: 'info',
    Canceled: 'neutral',
};

export const invoicesAllColumnKeys = ['Invoice No.', 'Date', 'Type', 'Customer / Supplier', 'Location', 'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Created By'];

export const getInvoicesColumns = (visibleColumns: string[]): ColumnConfig<Invoice>[] => {
    const allPossibleColumns: (ColumnConfig<Invoice> & { key: string })[] = [
        { field: 'invoiceNo', header: 'Invoice No.', key: 'Invoice No.', fieldType: 'text' },
        { field: 'date', header: 'Date', key: 'Date', fieldType: 'text' },
        { field: 'type', header: 'Type', key: 'Type', fieldType: 'status', options: { defaultVariant: 'info' } },
        { field: 'partyName', header: 'Customer / Supplier', key: 'Customer / Supplier', fieldType: 'text' },
        { field: 'locationName', header: 'Location', key: 'Location', fieldType: 'text' },
        { field: 'totalAmount', header: 'Total Amount', key: 'Total Amount', fieldType: 'currency', options: { decimals: 0 } },
        { field: 'paidAmount', header: 'Paid Amount', key: 'Paid Amount', fieldType: 'currency', options: { decimals: 0 } },
        { field: 'dueAmount', header: 'Due Amount', key: 'Due Amount', fieldType: 'currency', options: { decimals: 0 } },
        { field: 'status', header: 'Status', key: 'Status', fieldType: 'status', options: { variantMap: invoiceStatusVariant } },
        { field: 'createdBy', header: 'Created By', key: 'Created By', fieldType: 'text' },
    ];

    return allPossibleColumns.filter((col) => visibleColumns.includes(col.key));
};

const purchaseOrderStatusVariant: Record<PurchaseOrderStatus, StatusVariant> = {
    Draft: 'neutral',
    Sent: 'info',
    Approved: 'warning',
    Received: 'success',
    Cancelled: 'danger',
};

export const getPurchaseOrderColumns = (): ColumnConfig<PurchaseOrder>[] => [
    { field: 'poNumber', header: 'PO Number', fieldType: 'text' },
    { field: 'date', header: 'Date', fieldType: 'text' },
    { field: 'supplierName', header: 'Supplier', fieldType: 'text' },
    { field: 'locationName', header: 'Location', fieldType: 'text' },
    { field: 'totalAmount', header: 'Total Amount (Rs.)', fieldType: 'currency', options: { decimals: 0 } },
    { field: 'status', header: 'Status', fieldType: 'status', options: { variantMap: purchaseOrderStatusVariant } },
    { field: 'createdBy', header: 'Created By', fieldType: 'text' },
];

export const getReportsColumns = (): ColumnConfig<RecentReport>[] => [
    { field: 'name', header: 'Report Name', fieldType: 'text' },
    { field: 'type', header: 'Report Type', fieldType: 'status', options: { defaultVariant: 'info' } },
    { field: 'generatedOn', header: 'Generated On', fieldType: 'text' },
    { field: 'generatedBy', header: 'Generated By', fieldType: 'text' },
    { field: 'format', header: 'Format', fieldType: 'status', options: { variantMap: { PDF: 'danger', Excel: 'success' } } },
];
