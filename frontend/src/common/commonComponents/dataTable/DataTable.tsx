import { FilterMatchMode } from 'primereact/api';
import { Column } from 'primereact/column';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import type { ReactNode } from 'react';
import { Children, isValidElement, useState } from 'react';
import type { ColumnBodyType, DateBodyOptions, FieldTypeOptions, RowDataColumn } from '../../commonFunctions/CommonUtilities';
import { getColumnBodyTemplate } from '../../commonFunctions/CommonUtilities';
import './DataTable.css';

export interface ColumnConfig<T> {
    field: Extract<keyof T, string>;
    header: string;
    key?: string;
    sortable?: boolean;
    filter?: boolean;
    fieldType?: ColumnBodyType;
    options?: FieldTypeOptions<T>;
    body?: (row: T) => React.ReactNode;
    style?: React.CSSProperties;
}

// Best-effort plain-text extraction from a custom column's rendered output, used to give
// it a native hover tooltip for free (mirrors what getRowData already does for fieldType
// columns). Walks down through simple wrapper elements (e.g. <span>{value}</span>) but
// intentionally yields '' for interactive controls (Dropdown/InputNumber in editable
// item-row tables) since those don't expose their value via `children` - no text means no
// title gets added, so editable cells are left exactly as they were.
function extractCellText(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractCellText).join(' ').trim();
    if (isValidElement(node)) {
        return Children.toArray((node.props as { children?: ReactNode }).children).map(extractCellText).join(' ').trim();
    }
    return '';
}

function resolveColumnBody<T>(col: ColumnConfig<T>): ((row: T) => React.ReactNode) | undefined {
    if (col.body) {
        const customBody = col.body;
        return (row: T) => {
            const content = customBody(row);
            const text = extractCellText(content);
            return text ? <span title={text}>{content}</span> : content;
        };
    }
    if (col.fieldType) return getColumnBodyTemplate<T>({ field: col.field, fieldType: col.fieldType, options: col.options } as RowDataColumn<T>);
    return undefined;
}

// PrimeReact's <Column> doesn't re-render its cached cell just because the `body` closure
// identity changed (it isn't part of its internal prop comparison) - folding the active
// date format into the date columns' `key` forces React to treat it as a new element and
// remount it whenever the Settings > Date Format preference changes.
function resolveColumnKey<T>(col: ColumnConfig<T>): string {
    if (col.fieldType === 'date') {
        return `${col.key ?? col.field}-${(col.options as DateBodyOptions).formatOption}`;
    }
    return col.key ?? col.field;
}

interface AppDataTableProps<T> {
    value: T[];
    columns: ColumnConfig<T>[];
    actionBodyTemplate?: (row: T) => React.ReactNode;
    actionHeader?: string;
    rows?: number;
    paginator?: boolean;
    emptyMessage?: string;
    loading?: boolean;
    dataKey?: string;
    sortable?: boolean;
    filterable?: boolean;
    height?: string;
}

function buildDefaultFilters<T>(columns: ColumnConfig<T>[]): DataTableFilterMeta {
    const filters: DataTableFilterMeta = {};
    columns.forEach((col) => {
        if (!col.key && col.filter !== false) {
            filters[col.field] = { value: null, matchMode: FilterMatchMode.CONTAINS };
        }
    });
    return filters;
}

function DataTable<T extends object>({ value, columns, actionBodyTemplate, actionHeader = 'Action', rows = 10, paginator = true, emptyMessage = 'No records found.', loading = false, dataKey = 'id', sortable = true, filterable = true, height = 'flex' }: AppDataTableProps<T>) {
    const [filters, setFilters] = useState<DataTableFilterMeta>(() => buildDefaultFilters(columns));

    return (
        <PrimeDataTable
            value={value}
            paginator={paginator}
            rows={rows}
            rowsPerPageOptions={[10, 25, 50]}
            responsiveLayout="scroll"
            loading={loading}
            emptyMessage={emptyMessage}
            dataKey={dataKey}
            className="app-data-table"
            removableSort
            filters={filterable ? filters : undefined}
            onFilter={(e) => setFilters(e.filters)}
            filterDisplay={filterable ? 'menu' : undefined}
            scrollable={paginator}
            scrollHeight={paginator ? height : undefined}
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        >
            {actionBodyTemplate && (
                <Column key="action" header={actionHeader} sortable={false} filter={false} body={actionBodyTemplate} />
            )}
            {columns.map((col) => (
                <Column
                    key={resolveColumnKey(col)}
                    field={col.field}
                    header={col.header}
                    sortable={col.sortable ?? (sortable && !col.key)}
                    filter={filterable && !col.key && col.filter !== false}
                    filterPlaceholder={`Search ${col.header}`}
                    body={resolveColumnBody(col)}
                    style={col.style}
                />
            ))}
        </PrimeDataTable>
    );
}

export default DataTable;
