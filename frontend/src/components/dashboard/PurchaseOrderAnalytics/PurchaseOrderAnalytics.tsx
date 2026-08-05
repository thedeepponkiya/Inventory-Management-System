import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import { MdOutlineDonutLarge, MdOutlineBarChart } from 'react-icons/md';
import { HiOutlineDocumentChartBar } from 'react-icons/hi2';
import { AppContext } from '../../../context/AppContextDefinition';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../services/purchaseOrderService';
import '../Dashboard.css';
import './PurchaseOrderAnalytics.css';

// Same colors as the purchaseOrderStatusVariant mapping in CommonUtilities.tsx (neutral/info/success/danger)
const poStatusColors: Record<PurchaseOrderStatus, string> = {
    Draft: '#cbd5e1',
    Sent: '#7dd3fc',
    Received: '#86efac',
    Cancelled: '#fca5a5',
};

const PurchaseOrderAnalytics = () => {
    const navigate = useNavigate();
    const { purchaseOrders } = useContext(AppContext);
    const purchaseOrderList = purchaseOrders as PurchaseOrder[];
    const [poStatusChartType, setPoStatusChartType] = useState<'donut' | 'bar'>('donut');

    const totalPOs = purchaseOrderList.length;
    const totalPOValue = useMemo(() => purchaseOrderList.reduce((sum, po) => sum + po.grandTotal, 0), [purchaseOrderList]);
    const pendingPOs = useMemo(() => purchaseOrderList.filter((po) => po.status === 'Sent').length, [purchaseOrderList]);
    const receivedPOs = useMemo(() => purchaseOrderList.filter((po) => po.status === 'Received').length, [purchaseOrderList]);

    const poStatusBreakdown = useMemo(() => {
        const counts: Record<PurchaseOrderStatus, number> = { Draft: 0, Sent: 0, Received: 0, Cancelled: 0 };
        purchaseOrderList.forEach((po) => { counts[po.status] += 1; });
        return counts;
    }, [purchaseOrderList]);

    const poStatusChartData = useMemo(() => {
        const labels = Object.keys(poStatusBreakdown) as PurchaseOrderStatus[];
        const data = labels.map((label) => poStatusBreakdown[label]);
        const backgroundColor = labels.map((label) => poStatusColors[label]);
        if (poStatusChartType === 'bar') {
            return { labels, datasets: [{ label: 'Purchase Orders', data, backgroundColor, borderRadius: 4 }] };
        }
        return { labels, datasets: [{ data, backgroundColor, borderWidth: 0, borderRadius: 8, spacing: 3, hoverOffset: 6 }] };
    }, [poStatusBreakdown, poStatusChartType]);

    const poStatusDonutOptions = {
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: (context: { label?: string; parsed: number }) => `${context.label}: ${context.parsed} PO${context.parsed === 1 ? '' : 's'}` } },
        },
    };

    const poStatusBarOptions = {
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context: { parsed: { x: number } }) => `${context.parsed.x} PO${context.parsed.x === 1 ? '' : 's'}` } },
        },
        scales: { x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
    };

    const topVendorsByPOValue = useMemo(() => {
        const vendorTotals = new Map<string, { vendorName: string; totalValue: number; poCount: number }>();
        purchaseOrderList.forEach((po) => {
            const existing = vendorTotals.get(po.vendorName);
            if (existing) {
                existing.totalValue += po.grandTotal;
                existing.poCount += 1;
            } else {
                vendorTotals.set(po.vendorName, { vendorName: po.vendorName, totalValue: po.grandTotal, poCount: 1 });
            }
        });
        return Array.from(vendorTotals.values()).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
    }, [purchaseOrderList]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineDocumentChartBar size={18} className="dashboard-card-header-icon" />Purchase Order Analytics</h2>
                <span className="dashboard-card-link" onClick={() => navigate('/purchase-order')}>View all</span>
            </div>
            <div className="dashboard-stock-summary">
                <div>
                    <div className="dashboard-stock-summary-label">Total POs</div>
                    <div className="dashboard-stock-summary-value">{totalPOs}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">Total PO Value</div>
                    <div className="dashboard-stock-summary-value">Rs. {totalPOValue.toLocaleString('en-IN')}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">Pending POs</div>
                    <div className="dashboard-stock-summary-value">{pendingPOs}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">Received POs</div>
                    <div className="dashboard-stock-summary-value">{receivedPOs}</div>
                </div>
            </div>
            <div className="dashboard-analytics-split">
                <div>
                    <div className="dashboard-chart-type-toggle dashboard-analytics-chart-toggle">
                        <button type="button" className={`dashboard-chart-type-btn${poStatusChartType === 'donut' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setPoStatusChartType('donut')} title="Donut chart">
                            <MdOutlineDonutLarge size={16} />
                        </button>
                        <button type="button" className={`dashboard-chart-type-btn${poStatusChartType === 'bar' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setPoStatusChartType('bar')} title="Bar chart">
                            <MdOutlineBarChart size={16} />
                        </button>
                    </div>
                    <Chart
                        key={`po-status-${poStatusChartType}-${purchaseOrderList.length}`}
                        type={poStatusChartType === 'donut' ? 'doughnut' : 'bar'}
                        data={poStatusChartData}
                        options={poStatusChartType === 'donut' ? poStatusDonutOptions : poStatusBarOptions}
                        className="dashboard-analytics-chart"
                    />
                </div>
                <div className="dashboard-analytics-list">
                    <h3 className="dashboard-movement-title">Top Vendors by PO Value</h3>
                    {topVendorsByPOValue.length === 0 ? (
                        <div className="dashboard-empty-state">No Purchase Orders yet.</div>
                    ) : (
                        <div className="dashboard-low-stock-list">
                            {topVendorsByPOValue.map((vendor) => (
                                <div className="dashboard-low-stock-item" key={vendor.vendorName}>
                                    <div className="dashboard-low-stock-info">
                                        <div className="dashboard-low-stock-name">{vendor.vendorName}</div>
                                        <div className="dashboard-low-stock-sub">{vendor.poCount} PO{vendor.poCount === 1 ? '' : 's'}</div>
                                    </div>
                                    <div className="dashboard-low-stock-meta">
                                        <div className="dashboard-low-stock-min dashboard-low-stock-min--positive">Rs. {vendor.totalValue.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PurchaseOrderAnalytics;
