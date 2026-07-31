import { useState } from 'react';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode } from 'primereact/api';
import { getColumnBodyTemplate } from '../../commonFunctions/CommonUtilities';
import type { ColumnBodyType, FieldTypeOptions, RowDataColumn } from '../../commonFunctions/CommonUtilities';
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

function resolveColumnBody<T>(col: ColumnConfig<T>): ((row: T) => React.ReactNode) | undefined {
    if (col.body) return col.body;
    if (col.fieldType) return getColumnBodyTemplate<T>({ field: col.field, fieldType: col.fieldType, options: col.options } as RowDataColumn<T>);
    return undefined;
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
            stripedRows
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
                    key={col.key ?? col.field}
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
