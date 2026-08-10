import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { HiOutlineClipboardDocumentList, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge, { type StatusVariant } from '../../../common/commonComponents/statusBadge/StatusBadge';
import { AppContext } from '../../../context/AppContextDefinition';
import type { SalesOrder, SalesOrderStatus } from '../../../services/salesOrderService';
import '../Dashboard.css';

// Mirrors CommonUtilities.tsx's salesOrderStatusVariant mapping (kept local here rather than
// exported/shared, since this is the only other place a Sales Order status needs a badge
// color outside the full Sales Order table).
const salesOrderStatusVariant: Record<SalesOrderStatus, StatusVariant> = {
    Draft: 'neutral',
    Confirmed: 'success',
    Processing: 'info',
    'Partially Shipped': 'warning',
    Dispatched: 'purple',
    Cancelled: 'danger',
};

const RecentOrders = () => {
    const navigate = useNavigate();
    const { salesOrders } = useContext(AppContext);
    const salesOrderList = salesOrders as SalesOrder[];
    const [search, setSearch] = useState('');

    // No slice() cap - sorted newest-first and the DataTable paginates, so every Sales Order
    // is reachable rather than only the most recent 5 (same approach as Low Stock Alerts'
    // Table view).
    const recentSalesOrders = useMemo(
        () => [...salesOrderList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [salesOrderList],
    );

    const filteredSalesOrders = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return recentSalesOrders;
        return recentSalesOrders.filter((so) => so.soNo.toLowerCase().includes(term) || so.customerName.toLowerCase().includes(term));
    }, [recentSalesOrders, search]);

    const recentSalesOrdersColumns: ColumnConfig<SalesOrder>[] = [
        { field: 'soNo', header: 'SO No.', body: (row) => `#${row.soNo}` },
        { field: 'customerName', header: 'Customer' },
        { field: 'grandTotal', header: 'Grand Total', body: (row) => `₹${row.grandTotal.toLocaleString('en-IN')}` },
        {
            field: 'status',
            header: 'Status',
            body: (row) => <StatusBadge label={row.status} variant={salesOrderStatusVariant[row.status]} />,
        },
    ];

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineClipboardDocumentList size={18} className="dashboard-card-header-icon" />Recent Sales Orders</h2>
                <div className="dashboard-card-header-actions">
                    <span className="dashboard-search">
                        <HiOutlineMagnifyingGlass className="dashboard-search-icon" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SO no. or customer..." />
                    </span>
                    <span className="dashboard-card-link" onClick={() => navigate('/sales-order')}>View all</span>
                </div>
            </div>
            <DataTable value={filteredSalesOrders} columns={recentSalesOrdersColumns} rows={5} dataKey="id" emptyMessage={search.trim() ? `No sales orders match "${search}".` : undefined} />
        </div>
    );
};
export default RecentOrders;
