import { useContext, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Chart } from 'primereact/chart';
import type { Chart as ChartJSInstance } from 'chart.js';
import { HiOutlineArrowDownTray, HiOutlineCube, HiOutlineCalendarDays, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { MdFilterAltOff } from 'react-icons/md';
import DataTable, { type ColumnConfig } from '../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../context/AppContextDefinition';
import { useCompanyLogoContext } from '../../context/CompanyLogoContextDefinition';
import { useCompanySettingsContext } from '../../context/CompanySettingsContextDefinition';
import type { RawSku } from '../../services/rawSkuService';
import type { InventoryItem } from '../../services/inventoryService';
import type { PurchaseOrder } from '../../services/purchaseOrderService';
import type { SalesOrder } from '../../services/salesOrderService';
import type { MaterialInward } from '../../services/materialInwardService';
import type { Bom } from '../../services/bomService';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { getStockLevel } from '../../common/commonFunctions/CommonUtilities';
import { pieColors } from '../dashboard/dashboardUtils';
import { exportReportPdf } from '../../common/commonFunctions/reportPdf';
import { exportReportCsv } from '../../common/commonFunctions/reportCsv';
import { exportInventoryReportPdf } from '../../common/commonFunctions/inventoryReportPdf';
import './Reports.css';

interface ReportExport {
    head: string[];
    rows: (string | number)[][];
}

type StockTier = 'Good' | 'Medium' | 'Low' | 'Out of Stock';

interface StockSummaryRow {
    key: string;
    itemType: 'Raw Material' | 'Finished Good';
    skuCode: string;
    name: string;
    categoryName: string | null;
    locationName: string | null;
    unit: string;
    currentStock: number;
    stockValue: number | null;
    stockLevel: 'Low' | 'Medium' | 'Good';
    stockTier: StockTier;
    status: 'Active' | 'Inactive';
}

interface PartySummaryRow {
    name: string;
    orders: number;
    totalValue: number;
    paidAmount: number;
    balanceDue: number;
}

interface SkuMovementRow {
    skuCode: string;
    skuName: string;
    locationName: string | null;
    unit: string;
    inwardQty: number;
    consumedQty: number;
    netChange: number;
    currentStock: number;
}

interface BomConsumptionRow {
    key: string;
    bomCode: string;
    productName: string;
    outputQty: number;
    unit: string;
    completedDate: string;
    rawMaterialName: string;
    qtyConsumed: number;
    rawMaterialUnit: string;
}

type TabKey = 'stock' | 'sales' | 'purchase' | 'skuMovement' | 'bomConsumption';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'stock', label: 'Stock Summary' },
    { key: 'sales', label: 'Sales Report' },
    { key: 'purchase', label: 'Purchase Report' },
    { key: 'skuMovement', label: 'SKU Movement' },
    { key: 'bomConsumption', label: 'BOM Consumption' },
];

const STOCK_TIER_STYLE: Record<StockTier, { color: string; bg: string }> = {
    Good: { color: '#16a34a', bg: '#dcfce7' },
    Medium: { color: '#d97706', bg: '#fef3c7' },
    Low: { color: '#dc2626', bg: '#fee2e2' },
    'Out of Stock': { color: '#475569', bg: '#e2e8f0' },
};

const formatRupees = (value: number) => `Rs. ${value.toLocaleString('en-IN')}`;
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Shared by every report tab below - a date range filter narrows to [start 00:00, end 23:59]
// (inclusive both ends), a null start/end (no range picked) matches everything.
function buildDateMatcher(dateRange: Date[] | null) {
    const rangeStart = dateRange?.[0] ?? null;
    const rangeEnd = dateRange?.[1] ?? null;
    return (isoDate: string) => {
        const d = new Date(isoDate);
        const afterStart = !rangeStart || d >= new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
        const beforeEnd = !rangeEnd || d <= new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999);
        return afterStart && beforeEnd;
    };
}

// At/below 0 stock is its own tier (Out of Stock), distinct from Low - the shared
// getStockLevel() (used by Raw SKU/Inventory Home's own stock-health column) only has 3
// tiers, so this is a Reports-only 4-tier read of the exact same thresholds.
function getStockTier(currentStock: number, lowThreshold: number, maxStock: number): StockTier {
    if (currentStock <= 0) return 'Out of Stock';
    if (currentStock <= lowThreshold) return 'Low';
    if (maxStock > 0 && currentStock >= maxStock) return 'Good';
    return 'Medium';
}

const Reports = () => {
    const {
        rawSkus, rawSkusLoading,
        inventories, inventoriesLoading,
        purchaseOrders, purchaseOrdersLoading,
        salesOrders, salesOrdersLoading,
        materialInwards, materialInwardsLoading,
        boms, bomsLoading,
    } = useContext(AppContext);
    const { companyLogo } = useCompanyLogoContext();
    const { companyName, address } = useCompanySettingsContext();

    const rawSkuList = rawSkus as RawSku[];
    const inventoryList = inventories as InventoryItem[];
    const purchaseOrderList = purchaseOrders as PurchaseOrder[];
    const salesOrderList = salesOrders as SalesOrder[];
    const materialInwardList = materialInwards as MaterialInward[];
    const bomList = boms as Bom[];

    const dateOverlayRef = useRef<OverlayPanel>(null);

    const [activeTab, setActiveTab] = useState<TabKey>('stock');
    const [filters, setFilters] = useState<Record<string, unknown>>({
        dateRange: DEFAULT_DATA_TYPE_VALUE.NULL,
        search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING,
    });

    const dateRange = filters.dateRange as Date[] | null;
    const search = filters.search as string;
    const inRange = useMemo(() => buildDateMatcher(dateRange), [dateRange]);

    const dateRangeLabel = dateRange?.[0]
        ? `${dateRange[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${dateRange[1] ? dateRange[1].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : dateRange[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : 'Date Range';

    const filterSummary = useMemo(() => {
        const parts: string[] = [];
        if (dateRange?.[0]) {
            const start = dateRange[0].toLocaleDateString('en-IN');
            const end = dateRange[1] ? dateRange[1].toLocaleDateString('en-IN') : start;
            parts.push(`Date ${start} - ${end}`);
        }
        if (search) parts.push(`Search: "${search}"`);
        return parts.length > 0 ? `Filters: ${parts.join(' | ')}` : 'Filters: None (all data)';
    }, [dateRange, search]);

    // ---- Sales & Purchase / SKU Movement / BOM Consumption tabs all key off the date
    // range (order/received/completed date); Stock Summary doesn't (a stock snapshot has no
    // "date" of its own), only Search applies there. ----
    const filteredPOs = useMemo(
        () => purchaseOrderList.filter((po) => po.status !== 'Cancelled' && inRange(po.poDate)),
        [purchaseOrderList, inRange],
    );
    const filteredSOs = useMemo(
        () => salesOrderList.filter((so) => so.status !== 'Cancelled' && inRange(so.orderDate)),
        [salesOrderList, inRange],
    );

    // ---- Tab 1: Stock Summary ----
    const stockSummaryRows: StockSummaryRow[] = useMemo(() => {
        const raw: StockSummaryRow[] = rawSkuList.map((sku) => ({
            key: `raw-${sku.id}`,
            itemType: 'Raw Material',
            skuCode: sku.skuCode,
            name: sku.skuName,
            categoryName: sku.categoryName,
            locationName: sku.locationName,
            unit: sku.unit,
            currentStock: sku.currentStock,
            stockValue: DEFAULT_DATA_TYPE_VALUE.NULL,
            stockLevel: getStockLevel(sku.currentStock, sku.reorderLevel, sku.maxStock).label,
            stockTier: getStockTier(sku.currentStock, sku.reorderLevel, sku.maxStock),
            status: sku.status,
        }));
        const finished: StockSummaryRow[] = inventoryList.map((item) => ({
            key: `inv-${item.id}`,
            itemType: 'Finished Good',
            skuCode: item.skuId,
            name: item.productName,
            categoryName: item.categoryName,
            locationName: item.locationName,
            unit: item.unit,
            currentStock: item.quantity,
            stockValue: item.quantity * item.unitCost,
            stockLevel: getStockLevel(item.quantity, item.minStock, item.maxStock).label,
            stockTier: getStockTier(item.quantity, item.minStock, item.maxStock),
            status: item.status,
        }));
        return [...raw, ...finished];
    }, [rawSkuList, inventoryList]);

    const stockTierCounts = useMemo(() => {
        const counts: Record<StockTier, number> = { Good: 0, Medium: 0, Low: 0, 'Out of Stock': 0 };
        stockSummaryRows.forEach((row) => { counts[row.stockTier] += 1; });
        return counts;
    }, [stockSummaryRows]);

    const categoryBreakdown = useMemo(() => {
        const totals = new Map<string, number>();
        stockSummaryRows.forEach((row) => {
            const name = row.categoryName ?? 'Uncategorized';
            totals.set(name, (totals.get(name) ?? DEFAULT_DATA_TYPE_VALUE.ZERO) + 1);
        });
        return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    }, [stockSummaryRows]);
    const categoryColors = useMemo(() => categoryBreakdown.map((_, index) => pieColors[index % pieColors.length]), [categoryBreakdown]);

    const stockOverviewDonutData = useMemo(() => ({
        labels: categoryBreakdown.map(([label]) => label),
        datasets: [{ data: categoryBreakdown.map(([, value]) => value), backgroundColor: categoryColors, borderWidth: 0, borderRadius: 8, spacing: 3, hoverOffset: 6 }],
    }), [categoryBreakdown, categoryColors]);

    const centerTextPlugin = useMemo(() => ({
        id: 'centerText',
        afterDraw: (chart: ChartJSInstance) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = '700 22px Inter, system-ui, sans-serif';
            ctx.fillText(String(stockSummaryRows.length), centerX, centerY - 7);
            ctx.font = '500 11px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Total Items', centerX, centerY + 11);
            ctx.restore();
        },
    }), [stockSummaryRows.length]);

    const donutOptions = {
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context: { label?: string; parsed: number }) => `${context.label}: ${context.parsed} items` } },
        },
    };

    const displayedStockRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return stockSummaryRows.filter((row) => {
            return !term || row.skuCode.toLowerCase().includes(term) || row.name.toLowerCase().includes(term) || (row.categoryName ?? '').toLowerCase().includes(term);
        });
    }, [stockSummaryRows, search]);

    const stockSummaryColumns: ColumnConfig<StockSummaryRow>[] = [
        { field: 'itemType', header: 'Type', filterType: 'dropdown', filterOptions: ['Raw Material', 'Finished Good'] },
        { field: 'skuCode', header: 'SKU Code' },
        { field: 'name', header: 'Name' },
        { field: 'categoryName', header: 'Category', body: (row) => row.categoryName ?? '—' },
        { field: 'locationName', header: 'Location', body: (row) => row.locationName ?? '—' },
        { field: 'currentStock', header: 'Current Stock', body: (row) => `${row.currentStock} ${row.unit}` },
        { field: 'stockValue', header: 'Stock Value', body: (row) => (row.stockValue === null ? '—' : formatRupees(row.stockValue)) },
        { field: 'stockLevel', header: 'Stock Level', filterType: 'dropdown', filterOptions: ['Low', 'Medium', 'Good'] },
        { field: 'status', header: 'Status', filterType: 'dropdown', filterOptions: ['Active', 'Inactive'] },
    ];

    // ---- Tab 2: Sales & Purchase Summary ----
    const customerSummaryRows: PartySummaryRow[] = useMemo(() => {
        const term = search.trim().toLowerCase();
        const byCustomer = new Map<string, PartySummaryRow>();
        filteredSOs.forEach((so) => {
            const existing = byCustomer.get(so.customerName);
            const balanceDue = Math.max(so.grandTotal - so.paidAmount, DEFAULT_DATA_TYPE_VALUE.ZERO);
            if (existing) {
                existing.orders += 1;
                existing.totalValue += so.grandTotal;
                existing.paidAmount += so.paidAmount;
                existing.balanceDue += balanceDue;
            } else {
                byCustomer.set(so.customerName, { name: so.customerName, orders: 1, totalValue: so.grandTotal, paidAmount: so.paidAmount, balanceDue });
            }
        });
        return Array.from(byCustomer.values())
            .filter((row) => !term || row.name.toLowerCase().includes(term))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [filteredSOs, search]);

    const vendorSummaryRows: PartySummaryRow[] = useMemo(() => {
        const term = search.trim().toLowerCase();
        const byVendor = new Map<string, PartySummaryRow>();
        filteredPOs.forEach((po) => {
            const existing = byVendor.get(po.vendorName);
            const balanceDue = Math.max(po.grandTotal - po.paidAmount, DEFAULT_DATA_TYPE_VALUE.ZERO);
            if (existing) {
                existing.orders += 1;
                existing.totalValue += po.grandTotal;
                existing.paidAmount += po.paidAmount;
                existing.balanceDue += balanceDue;
            } else {
                byVendor.set(po.vendorName, { name: po.vendorName, orders: 1, totalValue: po.grandTotal, paidAmount: po.paidAmount, balanceDue });
            }
        });
        return Array.from(byVendor.values())
            .filter((row) => !term || row.name.toLowerCase().includes(term))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [filteredPOs, search]);

    const partySummaryColumns = (nameHeader: string): ColumnConfig<PartySummaryRow>[] => [
        { field: 'name', header: nameHeader },
        { field: 'orders', header: 'Orders' },
        { field: 'totalValue', header: 'Total Value', body: (row) => formatRupees(row.totalValue) },
        { field: 'paidAmount', header: 'Paid Amount', body: (row) => formatRupees(row.paidAmount) },
        { field: 'balanceDue', header: 'Balance Due', body: (row) => formatRupees(row.balanceDue) },
    ];

    // ---- Tab 3: SKU Movement ----
    const skuMovementRows: SkuMovementRow[] = useMemo(() => {
        const inwardBySku = new Map<string, number>();
        materialInwardList
            .filter((mi) => inRange(mi.receivedDate))
            .forEach((mi) => mi.items.forEach((item) => {
                inwardBySku.set(item.skuCode, (inwardBySku.get(item.skuCode) ?? DEFAULT_DATA_TYPE_VALUE.ZERO) + item.acceptedQty);
            }));

        const consumedBySku = new Map<string, number>();
        bomList
            .filter((bom) => bom.status === 'Completed' && inRange(bom.updatedAt))
            .forEach((bom) => bom.items.forEach((item) => {
                consumedBySku.set(item.rawSkuCode, (consumedBySku.get(item.rawSkuCode) ?? DEFAULT_DATA_TYPE_VALUE.ZERO) + item.requiredQty * bom.outputQty);
            }));

        const term = search.trim().toLowerCase();
        return rawSkuList
            .map((sku) => {
                const inwardQty = inwardBySku.get(sku.skuCode) ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                const consumedQty = consumedBySku.get(sku.skuCode) ?? DEFAULT_DATA_TYPE_VALUE.ZERO;
                return {
                    skuCode: sku.skuCode,
                    skuName: sku.skuName,
                    locationName: sku.locationName,
                    unit: sku.unit,
                    inwardQty,
                    consumedQty,
                    netChange: inwardQty - consumedQty,
                    currentStock: sku.currentStock,
                };
            })
            .filter((row) => row.inwardQty > 0 || row.consumedQty > 0)
            .filter((row) => !term || row.skuCode.toLowerCase().includes(term) || row.skuName.toLowerCase().includes(term));
    }, [materialInwardList, bomList, rawSkuList, inRange, search]);

    const skuMovementColumns: ColumnConfig<SkuMovementRow>[] = [
        { field: 'skuCode', header: 'SKU Code' },
        { field: 'skuName', header: 'SKU Name' },
        { field: 'locationName', header: 'Location', body: (row) => row.locationName ?? '—' },
        { field: 'inwardQty', header: 'Inward Qty', body: (row) => `${row.inwardQty} ${row.unit}` },
        { field: 'consumedQty', header: 'Consumed Qty', body: (row) => `${row.consumedQty} ${row.unit}` },
        { field: 'netChange', header: 'Net Change', body: (row) => `${row.netChange >= 0 ? '+' : ''}${row.netChange} ${row.unit}` },
        { field: 'currentStock', header: 'Current Stock', body: (row) => `${row.currentStock} ${row.unit}` },
    ];

    // ---- Tab 4: BOM Consumption ----
    const bomConsumptionRows: BomConsumptionRow[] = useMemo(() => {
        const term = search.trim().toLowerCase();
        const rows: BomConsumptionRow[] = [];
        bomList
            .filter((bom) => bom.status === 'Completed' && inRange(bom.updatedAt))
            .forEach((bom) => bom.items.forEach((item, index) => {
                rows.push({
                    key: `${bom.id}-${index}`,
                    bomCode: bom.bomCode,
                    productName: bom.productName,
                    outputQty: bom.outputQty,
                    unit: bom.unit,
                    completedDate: bom.updatedAt,
                    rawMaterialName: item.rawSkuName,
                    qtyConsumed: item.requiredQty * bom.outputQty,
                    rawMaterialUnit: item.unit,
                });
            }));
        return rows.filter((row) => !term
            || row.bomCode.toLowerCase().includes(term)
            || row.productName.toLowerCase().includes(term)
            || row.rawMaterialName.toLowerCase().includes(term));
    }, [bomList, inRange, search]);

    const bomConsumptionColumns: ColumnConfig<BomConsumptionRow>[] = [
        { field: 'bomCode', header: 'BOM Code' },
        { field: 'productName', header: 'Product' },
        { field: 'outputQty', header: 'Output Qty', body: (row) => `${row.outputQty} ${row.unit}` },
        { field: 'rawMaterialName', header: 'Raw Material' },
        { field: 'qtyConsumed', header: 'Qty Consumed', body: (row) => `${row.qtyConsumed} ${row.rawMaterialUnit}` },
        { field: 'completedDate', header: 'Completed On', body: (row) => formatDate(row.completedDate) },
    ];

    // ---- Shared (head, rows) export data - each pair feeds both the PDF and CSV export
    // button for its tab, so the two formats can never drift out of sync with each other. ----
    const stockSummaryExport: ReportExport = useMemo(() => ({
        head: ['Type', 'SKU Code', 'Name', 'Category', 'Location', 'Current Stock', 'Stock Value', 'Stock Level'],
        rows: displayedStockRows.map((row) => [
            row.itemType, row.skuCode, row.name, row.categoryName ?? '—', row.locationName ?? '—',
            `${row.currentStock} ${row.unit}`, row.stockValue === null ? '—' : formatRupees(row.stockValue), row.stockLevel,
        ]),
    }), [displayedStockRows]);

    const customerSummaryExport: ReportExport = useMemo(() => ({
        head: ['Customer', 'Orders', 'Total Value', 'Paid Amount', 'Balance Due'],
        rows: customerSummaryRows.map((row) => [row.name, row.orders, formatRupees(row.totalValue), formatRupees(row.paidAmount), formatRupees(row.balanceDue)]),
    }), [customerSummaryRows]);

    const vendorSummaryExport: ReportExport = useMemo(() => ({
        head: ['Vendor', 'Orders', 'Total Value', 'Paid Amount', 'Balance Due'],
        rows: vendorSummaryRows.map((row) => [row.name, row.orders, formatRupees(row.totalValue), formatRupees(row.paidAmount), formatRupees(row.balanceDue)]),
    }), [vendorSummaryRows]);

    const skuMovementExport: ReportExport = useMemo(() => ({
        head: ['SKU Code', 'SKU Name', 'Location', 'Inward Qty', 'Consumed Qty', 'Net Change', 'Current Stock'],
        rows: skuMovementRows.map((row) => [
            row.skuCode, row.skuName, row.locationName ?? '—', `${row.inwardQty} ${row.unit}`,
            `${row.consumedQty} ${row.unit}`, `${row.netChange >= 0 ? '+' : ''}${row.netChange} ${row.unit}`, `${row.currentStock} ${row.unit}`,
        ]),
    }), [skuMovementRows]);

    const bomConsumptionExport: ReportExport = useMemo(() => ({
        head: ['BOM Code', 'Product', 'Output Qty', 'Raw Material', 'Qty Consumed', 'Completed On'],
        rows: bomConsumptionRows.map((row) => [
            row.bomCode, row.productName, `${row.outputQty} ${row.unit}`, row.rawMaterialName,
            `${row.qtyConsumed} ${row.rawMaterialUnit}`, formatDate(row.completedDate),
        ]),
    }), [bomConsumptionRows]);

    // Single Export CSV/PDF pair driven by whichever tab is active - avoids 5 near-identical
    // button pairs (one per tab) that all did the exact same thing.
    const activeExport = useMemo(() => {
        switch (activeTab) {
            case 'stock': return { title: 'Stock Summary Report', filename: 'stock-summary-report', data: stockSummaryExport };
            case 'sales': return { title: 'Sales by Customer Report', filename: 'sales-by-customer-report', data: customerSummaryExport };
            case 'purchase': return { title: 'Purchases by Vendor Report', filename: 'purchases-by-vendor-report', data: vendorSummaryExport };
            case 'skuMovement': return { title: 'SKU Movement Report', filename: 'sku-movement-report', data: skuMovementExport };
            case 'bomConsumption': return { title: 'BOM Consumption Report', filename: 'bom-consumption-report', data: bomConsumptionExport };
        }
    }, [activeTab, stockSummaryExport, customerSummaryExport, vendorSummaryExport, skuMovementExport, bomConsumptionExport]);

    return (
        <div className="reports-page">
            <div className="reports-tabbar">
                <div className="reports-tabbar-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`reports-tabbar-tab${activeTab === tab.key ? ' reports-tabbar-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="reports-tabbar-actions">
                    <button type="button" className="reports-tabbar-date-btn" onClick={(e) => dateOverlayRef.current?.toggle(e)}>
                        <HiOutlineCalendarDays size={14} />
                        {dateRangeLabel}
                    </button>
                    <OverlayPanel ref={dateOverlayRef}>
                        <Calendar
                            value={dateRange}
                            onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.value }))}
                            selectionMode="range"
                            readOnlyInput
                            inline
                            dateFormat="dd M yy"
                        />
                        {dateRange?.[0] && (
                            <Button label="Clear" text size="small" onClick={() => setFilters((prev) => ({ ...prev, dateRange: DEFAULT_DATA_TYPE_VALUE.NULL }))} />
                        )}
                    </OverlayPanel>

                    <span className="reports-tabbar-search">
                        <HiOutlineMagnifyingGlass className="reports-tabbar-search-icon" />
                        <InputText value={search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search..." />
                    </span>

                    <Button
                        icon={<MdFilterAltOff />}
                        outlined
                        size="small"
                        aria-label="Clear filters"
                        onClick={() => setFilters({ dateRange: DEFAULT_DATA_TYPE_VALUE.NULL, search: DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING })}
                    />

                    <Button
                        label="Export CSV"
                        icon={<HiOutlineArrowDownTray className="mr-2" />}
                        outlined
                        size="small"
                        disabled={activeExport.data.rows.length === 0}
                        onClick={() => exportReportCsv(activeExport.data.head, activeExport.data.rows, `${activeExport.filename}.csv`)}
                    />
                    <Button
                        label="Export PDF"
                        icon={<HiOutlineArrowDownTray className="mr-2" />}
                        outlined
                        size="small"
                        disabled={activeExport.data.rows.length === 0}
                        onClick={() => {
                            // Stock Summary gets its own dedicated, richer layout (donut +
                            // stock-level cards + stat bar - see inventoryReportPdf.ts);
                            // every other tab is a plain table, so they stay on the generic
                            // title/head/rows exporter.
                            if (activeTab === 'stock') {
                                // Async (it may decode/crop the logo on an offscreen canvas
                                // first) - fire-and-forget from this click handler, same as
                                // every other export action on this page.
                                void exportInventoryReportPdf({
                                    rows: displayedStockRows,
                                    tierCounts: stockTierCounts,
                                    categoryBreakdown,
                                    categoryColors,
                                    logoDataUrl: companyLogo,
                                    companySettings: { companyName, address },
                                });
                                return;
                            }
                            exportReportPdf(activeExport.title, filterSummary, activeExport.data.head, activeExport.data.rows, `${activeExport.filename}.pdf`, companyLogo);
                        }}
                    />
                </div>
            </div>

            {activeTab === 'stock' && (
                <>
                    <div className="reports-overview-row">
                        <div className="reports-overview-card">
                            <h3 className="reports-overview-title">Stock Overview</h3>
                            <div className="reports-donut-row">
                                <div className="reports-donut-chart">
                                    <Chart type="doughnut" data={stockOverviewDonutData} options={donutOptions} plugins={[centerTextPlugin]} className="reports-donut-canvas" />
                                </div>
                                <div className="reports-donut-legend">
                                    {categoryBreakdown.map(([label, value], index) => {
                                        const percent = stockSummaryRows.length > 0 ? Math.round((value / stockSummaryRows.length) * 100) : DEFAULT_DATA_TYPE_VALUE.ZERO;
                                        return (
                                            <div className="reports-donut-legend-item" key={label}>
                                                <span className="reports-donut-legend-swatch" style={{ background: categoryColors[index] }} />
                                                <span className="reports-donut-legend-label">{label}</span>
                                                <span className="reports-donut-legend-count">{value} ({percent}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="reports-overview-card reports-overview-card--wide">
                            <h3 className="reports-overview-title">Stock Level Distribution</h3>
                            <div className="reports-tier-grid">
                                {(['Good', 'Medium', 'Low', 'Out of Stock'] as StockTier[]).map((tier) => {
                                    const count = stockTierCounts[tier];
                                    const percent = stockSummaryRows.length > 0 ? Math.round((count / stockSummaryRows.length) * 100) : DEFAULT_DATA_TYPE_VALUE.ZERO;
                                    const style = STOCK_TIER_STYLE[tier];
                                    return (
                                        <div className="reports-tier-card" key={tier}>
                                            <span className="reports-tier-icon" style={{ color: style.color, background: style.bg }}>
                                                <HiOutlineCube size={18} />
                                            </span>
                                            <div className="reports-tier-label">{tier === 'Good' ? 'High (Good)' : tier}</div>
                                            <div className="reports-tier-percent" style={{ color: style.color }}>{percent}%</div>
                                            <div className="reports-tier-count">{count} Items</div>
                                            <div className="reports-tier-track">
                                                <div className="reports-tier-fill" style={{ width: `${percent}%`, background: style.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <DataTable value={displayedStockRows} columns={stockSummaryColumns} loading={rawSkusLoading || inventoriesLoading} dataKey="key" />
                </>
            )}

            {activeTab === 'sales' && (
                <DataTable value={customerSummaryRows} columns={partySummaryColumns('Customer')} loading={salesOrdersLoading} dataKey="name" />
            )}

            {activeTab === 'purchase' && (
                <DataTable value={vendorSummaryRows} columns={partySummaryColumns('Vendor')} loading={purchaseOrdersLoading} dataKey="name" />
            )}

            {activeTab === 'skuMovement' && (
                <DataTable value={skuMovementRows} columns={skuMovementColumns} loading={materialInwardsLoading || bomsLoading || rawSkusLoading} dataKey="skuCode" />
            )}

            {activeTab === 'bomConsumption' && (
                <DataTable value={bomConsumptionRows} columns={bomConsumptionColumns} loading={bomsLoading} dataKey="key" />
            )}
        </div>
    );
};

export default Reports;
