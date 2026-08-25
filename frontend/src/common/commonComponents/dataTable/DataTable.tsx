import { FilterMatchMode } from 'primereact/api';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import type { DataTableFilterMeta } from 'primereact/datatable';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import type { ReactNode, Ref } from 'react';
import { Children, forwardRef, isValidElement, useImperativeHandle, useState } from 'react';
import type { ColumnBodyType, DateBodyOptions, FieldTypeOptions, RowDataColumn } from '../../commonFunctions/CommonUtilities';
import { getColumnBodyTemplate } from '../../commonFunctions/CommonUtilities';
import emptyBoxIllustration from '../../../assets/empty-box.png';
import './DataTable.css';

export interface ColumnConfig<T> {
    field: Extract<keyof T, string>;
    header: string;
    key?: string;
    sortable?: boolean;
    filter?: boolean;
    // Lets a column's filter target a different (usually derived/computed) field than the
    // one it displays - e.g. Current Stock's body renders a rich composite cell, but its
    // filter dropdown matches against a separately-computed tier label field on the row.
    filterField?: Extract<keyof T, string>;
    // Defaults to the standard free-text CONTAINS filter; 'dropdown' renders a Dropdown
    // (populated from filterOptions) doing an exact-match filter instead.
    filterType?: 'text' | 'dropdown';
    filterOptions?: string[];
    fieldType?: ColumnBodyType;
    options?: FieldTypeOptions<T>;
    body?: (row: T) => React.ReactNode;
    style?: React.CSSProperties;
    // Opt-out, not opt-in - defaults to false (column always shows) so every existing table's
    // columns behave exactly as before (still reachable via horizontal scroll on mobile
    // regardless). Only set true on columns a page has explicitly curated as non-essential on
    // a phone-width screen - see DataTable.css's mobile breakpoint.
    hideOnMobile?: boolean;
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
    actionColumnStyle?: React.CSSProperties;
    rows?: number;
    paginator?: boolean;
    emptyMessage?: string;
    emptyDescription?: string;
    loading?: boolean;
    dataKey?: string;
    sortable?: boolean;
    filterable?: boolean;
    height?: string;
    // Adds a checkbox column (select-all in the header, per-row below) - selection state is
    // controlled by the caller (see useBulkDelete.ts), same as every other piece of DataTable
    // state that already lives outside this component (column filters are the one exception,
    // kept local - see DataTableHandle.clearFilters for how a caller can still reset them).
    selectable?: boolean;
    selection?: T[];
    onSelectionChange?: (rows: T[]) => void;
    // Adds an expander column - clicking it reveals rowExpansionTemplate's content inline
    // beneath that row (e.g. Reports.tsx's per-customer/vendor Transaction History). Expanded
    // state is kept internal (same reasoning as `filters` above) since no caller needs to
    // read or control it from outside.
    expandable?: boolean;
    rowExpansionTemplate?: (row: T) => React.ReactNode;
}

// Imperative escape hatch for the one piece of state DataTable keeps local (per-column
// filters from the filter-menu popups) - FilterBar's "Clear filters" button lives in a
// sibling component and only resets its own search/dropdown state, so pages wire this up
// in their `onReset` to also clear column filters instead of leaving them stuck applied.
export interface DataTableHandle {
    clearFilters: () => void;
}

function buildDefaultFilters<T>(columns: ColumnConfig<T>[]): DataTableFilterMeta {
    const filters: DataTableFilterMeta = {};
    columns.forEach((col) => {
        if (!col.key && col.filter !== false) {
            const key = col.filterField ?? col.field;
            filters[key] = { value: null, matchMode: col.filterType === 'dropdown' ? FilterMatchMode.EQUALS : FilterMatchMode.CONTAINS };
        }
    });
    return filters;
}

function renderDropdownFilter(placeholder: string, options: string[]) {
    return (filterOptions: { value: unknown; filterApplyCallback: (value: unknown) => void }) => (
        <Dropdown
            value={filterOptions.value}
            options={options}
            onChange={(e) => filterOptions.filterApplyCallback(e.value)}
            placeholder={placeholder}
            showClear
            className="p-column-filter"
        />
    );
}

function DataTableInner<T extends object>({ value, columns, actionBodyTemplate, actionHeader = 'Action', actionColumnStyle, rows = 25, paginator = true, emptyMessage, emptyDescription, loading = false, dataKey = 'id', sortable = true, filterable = true, height = 'flex', selectable = false, selection, onSelectionChange, expandable = false, rowExpansionTemplate }: AppDataTableProps<T>, ref: Ref<DataTableHandle>) {
    const [filters, setFilters] = useState<DataTableFilterMeta>(() => buildDefaultFilters(columns));
    const [expandedRows, setExpandedRows] = useState<T[]>([]);

    useImperativeHandle(ref, () => ({
        clearFilters: () => setFilters(buildDefaultFilters(columns)),
    }));

    const emptyTitle = emptyMessage ?? 'No results found';
    const emptyDesc = emptyMessage ? emptyDescription : (emptyDescription ?? "We couldn't find any items matching your search.");
    const emptyState = (
        <div className="app-data-table-empty">
            <img src={emptyBoxIllustration} alt="" className="app-data-table-empty-illustration" />
            <h4 className="app-data-table-empty-title">{emptyTitle}</h4>
            {emptyDesc && <p className="app-data-table-empty-desc">{emptyDesc}</p>}
        </div>
    );

    return (
        <PrimeDataTable
            value={value}
            paginator={paginator}
            rows={rows}
            rowsPerPageOptions={[10, 25, 50]}
            responsiveLayout="scroll"
            loading={loading}
            emptyMessage={emptyState}
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
            selectionMode={selectable ? 'checkbox' : null}
            // Without this, the header "select all" checkbox selects every row in `value`
            // (i.e. the whole filtered dataset across all pages) since PrimeReact's default
            // header-checkbox behavior ignores pagination entirely - only the per-page rows
            // are meant to toggle here, matching what a paginated table's header checkbox
            // should do.
            selectionPageOnly={paginator}
            // PrimeReact's own DataTable generic is keyed off its `value` prop's element type,
            // which our T-generic wrapper can't propagate through cleanly - same class of
            // library-type mismatch as e.g. salesOrderInvoicePdf.ts's `(doc as any).lastAutoTable`.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selection={(selectable ? (selection ?? []) : undefined) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSelectionChange={selectable && onSelectionChange ? (e: any) => onSelectionChange(e.value as T[]) : undefined}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expandedRows={(expandable ? expandedRows : undefined) as any}
            onRowToggle={expandable ? (e) => setExpandedRows(e.data as T[]) : undefined}
            rowExpansionTemplate={expandable && rowExpansionTemplate ? (row) => rowExpansionTemplate(row as T) : undefined}
        >
            {expandable && <Column key="__expander" expander style={{ width: '3rem' }} />}
            {selectable && <Column key="__selection" selectionMode="multiple" headerStyle={{ width: '3rem' }} style={{ width: '3rem' }} />}
            {actionBodyTemplate && (
                <Column key="action" header={actionHeader} sortable={false} filter={false} body={actionBodyTemplate} style={actionColumnStyle} />
            )}
            {columns.map((col) => (
                <Column
                    key={resolveColumnKey(col)}
                    field={col.field}
                    header={col.header}
                    sortable={col.sortable ?? (sortable && !col.key)}
                    filter={filterable && !col.key && col.filter !== false}
                    filterField={col.filterField}
                    showFilterMatchModes={col.filterType !== 'dropdown'}
                    filterElement={col.filterType === 'dropdown' && col.filterOptions ? renderDropdownFilter(`Select ${col.header}`, col.filterOptions) : undefined}
                    filterPlaceholder={`Search ${col.header}`}
                    body={resolveColumnBody(col)}
                    style={col.style}
                    className={col.hideOnMobile ? 'app-data-table-col-hide-mobile' : undefined}
                />
            ))}
        </PrimeDataTable>
    );
}

// forwardRef erases the component's own generic, so the wrapping cast restores `<T>` for
// callers - the standard pattern for a generic component that also needs to expose a ref.
const DataTable = forwardRef(DataTableInner) as <T extends object>(
    props: AppDataTableProps<T> & { ref?: Ref<DataTableHandle> }
) => ReturnType<typeof DataTableInner>;

export default DataTable;
