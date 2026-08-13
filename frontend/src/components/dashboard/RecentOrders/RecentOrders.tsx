import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import type { IconType } from 'react-icons';
import {
    HiOutlineClipboardDocumentList,
    HiOutlineMagnifyingGlass,
    HiChevronRight,
    HiOutlineCalendarDays,
    HiOutlineDocumentText,
    HiOutlineCheckCircle,
    HiOutlineCog6Tooth,
    HiOutlineTruck,
    HiOutlineXCircle,
} from 'react-icons/hi2';
import DataTable, { type ColumnConfig } from '../../../common/commonComponents/dataTable/DataTable';
import StatusBadge, { type StatusVariant } from '../../../common/commonComponents/statusBadge/StatusBadge';
import { AppContext } from '../../../context/AppContextDefinition';
import { useDateFormatContext } from '../../../context/DateFormatContextDefinition';
import { formatDate } from '../../../common/commonFunctions/dateFormat';
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

// Mobile list view only (see .dashboard-recent-order-icon below) - a status-appropriate icon
// in a colored box, same variant colors as the status badge next to it.
const salesOrderStatusIcon: Record<SalesOrderStatus, IconType> = {
    Draft: HiOutlineDocumentText,
    Confirmed: HiOutlineCheckCircle,
    Processing: HiOutlineCog6Tooth,
    'Partially Shipped': HiOutlineTruck,
    Dispatched: HiOutlineTruck,
    Cancelled: HiOutlineXCircle,
};

const RecentOrders = () => {
    const navigate = useNavigate();
    const { salesOrders } = useContext(AppContext);
    const salesOrderList = salesOrders as SalesOrder[];
    const { dateFormat } = useDateFormatContext();
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
            hideOnMobile: true,
        },
    ];

    return (
        <div className="dashboard-card dashboard-recent-orders-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineClipboardDocumentList size={18} className="dashboard-card-header-icon" />Recent Sales Orders</h2>
                <div className="dashboard-card-header-actions">
                    <span className="dashboard-search">
                        <HiOutlineMagnifyingGlass className="dashboard-search-icon" />
                        <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SO no. or customer..." />
                    </span>
                    <span className="dashboard-card-link" onClick={() => navigate('/sales-order')}>
                        View all
                        <HiChevronRight size={14} />
                    </span>
                </div>
            </div>
            {/* Desktop/tablet: the normal DataTable. Hidden ≤700px (see Dashboard.css) in
                favor of the plain stacked list below - fighting a wide multi-column
                PrimeReact table into a narrow card is exactly the problem LowStockAlerts
                already sidesteps by defaulting to a list view instead of its own DataTable. */}
            <div className="dashboard-recent-orders-table">
                <DataTable value={filteredSalesOrders} columns={recentSalesOrdersColumns} rows={5} dataKey="id" emptyMessage={search.trim() ? `No sales orders match "${search}".` : undefined} />
            </div>

            {/* Mobile only (≤700px) - same stacked-list pattern as LowStockAlerts' default
                list view, immune to PrimeReact DataTable's internal width/overflow quirks
                on a narrow card since there's no wide <table> element involved at all. */}
            <div className="dashboard-recent-orders-list">
                {filteredSalesOrders.length === 0 ? (
                    <div className="dashboard-empty-state">{search.trim() ? `No sales orders match "${search}".` : 'No sales orders yet.'}</div>
                ) : (
                    filteredSalesOrders.map((so) => {
                        const StatusIcon = salesOrderStatusIcon[so.status];
                        const variant = salesOrderStatusVariant[so.status];
                        return (
                            <div className="dashboard-recent-order-item" key={so.id} onClick={() => navigate(`/sales-order/${so.id}`)}>
                                <span className={`dashboard-recent-order-icon dashboard-recent-order-icon--${variant}`}>
                                    <StatusIcon size={20} />
                                </span>
                                <div className="dashboard-recent-order-info">
                                    <div className="dashboard-recent-order-no">#{so.soNo}</div>
                                    <div className="dashboard-recent-order-customer">{so.customerName}</div>
                                    <div className="dashboard-recent-order-date">
                                        <HiOutlineCalendarDays size={13} />
                                        {formatDate(so.orderDate, dateFormat)}
                                    </div>
                                </div>
                                <div className="dashboard-recent-order-meta">
                                    <div className="dashboard-recent-order-total">₹{so.grandTotal.toLocaleString('en-IN')}</div>
                                    <StatusBadge label={so.status} variant={variant} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
export default RecentOrders;
