import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import type { Chart as ChartJSInstance } from 'chart.js';
import { Dropdown } from 'primereact/dropdown';
import {
    HiOutlineCube,
    HiOutlineClipboardDocumentCheck,
    HiOutlineSquares2X2,
    HiOutlineShoppingCart,
} from 'react-icons/hi2';
import { MdOutlineDonutLarge, MdOutlinePieChart, MdOutlineBarChart } from 'react-icons/md';
import { KpiCardRow } from '../../common/commonComponents/kpiCard/KpiCard';
import DataTable from '../../common/commonComponents/dataTable/DataTable';
import StatusBadge from '../../common/commonComponents/statusBadge/StatusBadge';
import { useDataContext } from '../../context/DataContext';
import './Dashboard.css';

const pieColors = ['#93c5fd', '#86efac', '#fcd34d', '#c4b5fd', '#fca5a5', '#7dd3fc', '#fdba74', '#f9a8d4', '#cbd5e1'];

const Dashboard = () => {
    const navigate = useNavigate();
    const { dashboard, transactions, inventoryHomeItems } = useDataContext();
    const [monthFilter, setMonthFilter] = useState('This Month');
    const [distributionView, setDistributionView] = useState<'donut' | 'pie' | 'bar'>('donut');

    const chartData = useMemo(
        () => ({
            labels: dashboard.data.stockOverviewLabels,
            datasets: [
                {
                    label: 'Inward',
                    data: dashboard.data.stockOverviewSeries.inward,
                    borderColor: '#86efac',
                    backgroundColor: 'rgba(134, 239, 172, 0.15)',
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Issued',
                    data: dashboard.data.stockOverviewSeries.issued,
                    borderColor: '#fca5a5',
                    backgroundColor: 'rgba(252, 165, 165, 0.15)',
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Available',
                    data: dashboard.data.stockOverviewSeries.available,
                    borderColor: '#93c5fd',
                    backgroundColor: 'rgba(147, 197, 253, 0.15)',
                    tension: 0.4,
                    fill: true,
                },
            ],
        }),
        [dashboard.data],
    );

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' as const, align: 'end' as const } },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } },
        },
    };

    const locationEntries = useMemo(() => {
        const totals = new Map<string, number>();
        inventoryHomeItems.data.forEach((item) => {
            totals.set(item.locationName, (totals.get(item.locationName) ?? 0) + 1);
        });
        return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    }, [inventoryHomeItems.data]);

    const locationColors = useMemo(
        () => locationEntries.map((_, index) => pieColors[index % pieColors.length]),
        [locationEntries],
    );

    const pieData = useMemo(
        () => ({
            labels: locationEntries.map(([label]) => label),
            datasets: [
                {
                    data: locationEntries.map(([, value]) => value),
                    backgroundColor: locationColors,
                    borderWidth: 0,
                },
            ],
        }),
        [locationEntries, locationColors],
    );

    const donutData = useMemo(
        () => ({
            labels: locationEntries.map(([label]) => label),
            datasets: [
                {
                    data: locationEntries.map(([, value]) => value),
                    backgroundColor: locationColors,
                    borderWidth: 0,
                    borderRadius: 8,
                    spacing: 3,
                    hoverOffset: 6,
                },
            ],
        }),
        [locationEntries, locationColors],
    );

    const totalSkuCount = useMemo(() => locationEntries.reduce((sum, [, value]) => sum + value, 0), [locationEntries]);

    const centerTextPlugin = useMemo(
        () => ({
            id: 'centerText',
            afterDraw: (chart: ChartJSInstance) => {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                const centerX = (chartArea.left + chartArea.right) / 2;
                const centerY = (chartArea.top + chartArea.bottom) / 2;
                ctx.save();
                ctx.font = '600 14px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#0f172a';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Total: ${totalSkuCount}`, centerX, centerY);
                ctx.restore();
            },
        }),
        [totalSkuCount],
    );

    const barData = useMemo(
        () => ({
            labels: locationEntries.map(([label]) => label),
            datasets: [
                {
                    label: 'SKU Count',
                    data: locationEntries.map(([, value]) => value),
                    backgroundColor: locationColors,
                    borderRadius: 4,
                    barThickness: 22,
                },
            ],
        }),
        [locationEntries, locationColors],
    );

    const barOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context: { parsed: { y: number } }) => `${context.parsed.y} SKU` } },
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } },
        },
    };

    const pieOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    boxWidth: 10,
                    font: { size: 11 },
                    generateLabels: (chart: { data: { labels?: unknown[]; datasets: { data: unknown[]; backgroundColor: string[] }[] } }) => {
                        const { labels = [], datasets } = chart.data;
                        const values = datasets[0]?.data as number[];
                        const colors = datasets[0]?.backgroundColor;
                        return (labels as string[]).map((label, index) => ({
                            text: `${label} - ${values[index]} SKU`,
                            fillStyle: colors[index],
                            index,
                        }));
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: { label?: string; parsed: number }) => `${context.label}: ${context.parsed} SKU`,
                },
            },
        },
    };

    const donutOptions = { ...pieOptions, cutout: '68%' };

    const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const recentTransactionColumns = [
        { field: 'referenceNo' as const, header: 'Reference No.' },
        { field: 'itemName' as const, header: 'Item / Kit Name' },
        { field: 'quantity' as const, header: 'Quantity' },
        { field: 'dateTime' as const, header: 'Date' },
        { field: 'createdBy' as const, header: 'User' },
        {
            field: 'id' as const,
            header: 'Status',
            body: () => <StatusBadge label="Completed" variant="success" />,
        },
    ];

    return (
        <div className="dashboard-page">
            <KpiCardRow
                columns={4}
                items={[
                    { icon: HiOutlineCube, iconBg: '#dbeafe', iconColor: '#2563eb', label: 'Total SKUs', value: dashboard.data.kpis.totalSkus, sublabel: 'All items in inventory', linkLabel: 'View all SKUs', onClick: () => navigate('/sku-master') },
                    { icon: HiOutlineClipboardDocumentCheck, iconBg: '#dcfce7', iconColor: '#16a34a', label: 'Total Stock Value', value: `Rs. ${dashboard.data.kpis.totalStockValue.toLocaleString('en-IN')}`, sublabel: 'Current inventory value', linkLabel: 'View stock value', onClick: () => navigate('/reports') },
                    { icon: HiOutlineSquares2X2, iconBg: '#ede9fe', iconColor: '#7c3aed', label: 'Total Kits', value: dashboard.data.kpis.totalKits, sublabel: 'All configured kits', linkLabel: 'View all kits', onClick: () => navigate('/home') },
                    { icon: HiOutlineShoppingCart, iconBg: '#ffedd5', iconColor: '#ea580c', label: 'Kits Issued (This Month)', value: dashboard.data.kpis.kitsIssuedThisMonth, sublabel: `Till now in ${currentMonthLabel}`, linkLabel: 'View transactions', onClick: () => navigate('/transactions') },
                ]}
            />

            <div className="dashboard-overview-grid">
                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h2>Stock Overview</h2>
                        <Dropdown
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.value)}
                            options={['This Month', 'Last Month', 'Last 3 Months']}
                            className="dashboard-month-dropdown"
                        />
                    </div>
                    <Chart type="line" data={chartData} options={chartOptions} className="dashboard-chart" />
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-card-header">
                        <h2>Stock Distribution</h2>
                        <div className="dashboard-chart-type-toggle">
                            <button type="button" className={`dashboard-chart-type-btn${distributionView === 'donut' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setDistributionView('donut')} title="Donut chart">
                                <MdOutlineDonutLarge size={16} />
                            </button>
                            <button type="button" className={`dashboard-chart-type-btn${distributionView === 'pie' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setDistributionView('pie')} title="Pie chart">
                                <MdOutlinePieChart size={16} />
                            </button>
                            <button type="button" className={`dashboard-chart-type-btn${distributionView === 'bar' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setDistributionView('bar')} title="Bar chart">
                                <MdOutlineBarChart size={16} />
                            </button>
                        </div>
                    </div>

                    {distributionView === 'donut' && (
                        <Chart type="doughnut" data={donutData} options={donutOptions} plugins={[centerTextPlugin]} className="dashboard-pie-chart" />
                    )}

                    {distributionView === 'pie' && (
                        <Chart type="pie" data={pieData} options={pieOptions} className="dashboard-pie-chart" />
                    )}

                    {distributionView === 'bar' && (
                        <Chart type="bar" data={barData} options={barOptions} className="dashboard-chart" />
                    )}
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-main-col">
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2>Recent Transactions</h2>
                            <span className="dashboard-card-link" onClick={() => navigate('/transactions')}>View all</span>
                        </div>
                        <DataTable value={transactions.data.slice(0, 5)} columns={recentTransactionColumns} paginator={false} loading={transactions.loading} />
                    </div>
                </div>

                <div className="dashboard-side-col">
                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <h2>Low Stock Alerts</h2>
                            <span className="dashboard-card-link" onClick={() => navigate('/sku-master')}>View all</span>
                        </div>
                        <div className="dashboard-low-stock-list">
                            {dashboard.data.lowStockAlerts.map((item) => {
                                const ratio = Math.min(100, (item.currentStock / item.minStock) * 100);
                                return (
                                    <div className="dashboard-low-stock-item" key={item.id}>
                                        <div className="dashboard-low-stock-info">
                                            <div className="dashboard-low-stock-name">{item.skuName}</div>
                                            <div className="dashboard-low-stock-sub">Current Stock: {item.currentStock}</div>
                                        </div>
                                        <div className="dashboard-low-stock-meta">
                                            <div className="dashboard-low-stock-min">Min. Stock: {item.minStock}</div>
                                            <div className="dashboard-low-stock-bar">
                                                <div className="dashboard-low-stock-bar-fill" style={{ width: `${ratio}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Dashboard;
