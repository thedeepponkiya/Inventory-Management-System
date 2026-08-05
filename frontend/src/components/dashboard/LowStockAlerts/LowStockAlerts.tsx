import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { HiOutlineExclamationTriangle, HiOutlineListBullet, HiOutlineTableCells, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import DataTable from '../../../common/commonComponents/dataTable/DataTable';
import type { ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import { AppContext } from '../../../context/AppContextDefinition';
import type { RawSku } from '../../../services/rawSkuService';
import { getStockSeverityColor } from '../dashboardUtils';
import '../Dashboard.css';
import './LowStockAlerts.css';

const LowStockAlerts = () => {
    const navigate = useNavigate();
    const { rawSkus } = useContext(AppContext);
    const rawSkuList = rawSkus as RawSku[];
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
    const [search, setSearch] = useState('');

    // No slice() cap here - the list scrolls (.dashboard-low-stock-list--scroll) in List
    // View and paginates in Table View, so every SKU below its minimum stock is reachable,
    // not just the first N by severity.
    const lowStockItems = useMemo(
        () => rawSkuList
            .filter((sku) => sku.minStock > 0 && sku.currentStock <= sku.minStock)
            .sort((a, b) => a.currentStock / a.minStock - b.currentStock / b.minStock),
        [rawSkuList],
    );

    const filteredItems = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return lowStockItems;
        return lowStockItems.filter((item) => item.skuName.toLowerCase().includes(term) || item.skuCode.toLowerCase().includes(term));
    }, [lowStockItems, search]);

    const tableColumns: ColumnConfig<RawSku>[] = [
        { field: 'skuCode', header: 'SKU Code', body: (row) => `#${row.skuCode}` },
        { field: 'skuName', header: 'SKU Name' },
        { field: 'locationName', header: 'Location', body: (row) => row.locationName ?? '—' },
        {
            field: 'currentStock',
            header: 'Current Stock',
            body: (row) => <span style={{ color: getStockSeverityColor(row.currentStock, row.minStock), fontWeight: 700 }}>{row.currentStock}</span>,
        },
        { field: 'minStock', header: 'Min. Stock' },
    ];

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2>
                    <HiOutlineExclamationTriangle size={18} className="dashboard-card-header-icon" />
                    Low Stock Alerts
                    {lowStockItems.length > 0 && <span className="dashboard-card-header-count">{lowStockItems.length}</span>}
                </h2>
                <span className="dashboard-card-link" onClick={() => navigate('/raw-sku')}>View all</span>
            </div>

            {lowStockItems.length > 0 && (
                <div className="dashboard-low-stock-toolbar">
                    <span className="dashboard-low-stock-search">
                        <HiOutlineMagnifyingGlass className="dashboard-low-stock-search-icon" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU name or code..." />
                    </span>
                    <div className="dashboard-chart-type-toggle">
                        <button type="button" className={`dashboard-chart-type-btn${viewMode === 'list' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setViewMode('list')} title="List view">
                            <HiOutlineListBullet size={16} />
                        </button>
                        <button type="button" className={`dashboard-chart-type-btn${viewMode === 'table' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setViewMode('table')} title="Table view">
                            <HiOutlineTableCells size={16} />
                        </button>
                    </div>
                </div>
            )}

            {lowStockItems.length === 0 ? (
                <div className="dashboard-empty-state">No SKUs are currently below their minimum stock level.</div>
            ) : filteredItems.length === 0 ? (
                <div className="dashboard-empty-state">No SKUs match "{search}".</div>
            ) : viewMode === 'table' ? (
                <DataTable value={filteredItems} columns={tableColumns} dataKey="id" rows={10} />
            ) : (
                <div className="dashboard-low-stock-list dashboard-low-stock-list--scroll">
                    {filteredItems.map((item) => {
                        const ratio = Math.min(100, (item.currentStock / item.minStock) * 100);
                        const severityColor = getStockSeverityColor(item.currentStock, item.minStock);
                        return (
                            <div className="dashboard-low-stock-item" key={item.id}>
                                <div className="dashboard-low-stock-info">
                                    <div className="dashboard-low-stock-name">{item.skuName}</div>
                                    <div className="dashboard-low-stock-sub">
                                        Current Stock: <span style={{ color: severityColor, fontWeight: 700 }}>{item.currentStock}</span>
                                    </div>
                                    <div className="dashboard-low-stock-sub">Location: {item.locationName ?? '—'}</div>
                                </div>
                                <div className="dashboard-low-stock-meta">
                                    <div className="dashboard-low-stock-min">Min. Stock: {item.minStock}</div>
                                    <div className="dashboard-low-stock-bar">
                                        <div className="dashboard-low-stock-bar-fill" style={{ width: `${ratio}%`, background: severityColor }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
export default LowStockAlerts;
