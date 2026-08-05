import { useContext, useMemo, useState } from 'react';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { MdOutlineBarChart, MdOutlineShowChart } from 'react-icons/md';
import { AppContext } from '../../../context/AppContextDefinition';
import type { Bom } from '../../../services/bomService';
import { buildTrendBuckets, countByBucket, trendChartOptions } from '../dashboardUtils';
import '../Dashboard.css';

const OrdersTrend = () => {
    const { boms } = useContext(AppContext);
    const bomList = boms as Bom[];
    const [monthFilter, setMonthFilter] = useState('This Month');
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    const orderTrend = useMemo(() => {
        const buckets = buildTrendBuckets(monthFilter);
        const createdDates = bomList.map((bom) => new Date(bom.createdAt));
        const dispatchedDates = bomList.filter((bom) => bom.status === 'Dispatch').map((bom) => new Date(bom.updatedAt));
        return {
            labels: buckets.map((bucket) => bucket.label),
            created: countByBucket(createdDates, buckets),
            dispatched: countByBucket(dispatchedDates, buckets),
        };
    }, [monthFilter, bomList]);

    const chartData = useMemo(() => {
        if (chartType === 'bar') {
            return {
                labels: orderTrend.labels,
                datasets: [
                    { label: 'Orders Created', data: orderTrend.created, backgroundColor: '#93c5fd', borderRadius: 4 },
                    { label: 'Orders Dispatched', data: orderTrend.dispatched, backgroundColor: '#86efac', borderRadius: 4 },
                ],
            };
        }
        return {
            labels: orderTrend.labels,
            datasets: [
                { label: 'Orders Created', data: orderTrend.created, borderColor: '#93c5fd', backgroundColor: 'rgba(147, 197, 253, 0.15)', tension: 0.4, fill: true },
                { label: 'Orders Dispatched', data: orderTrend.dispatched, borderColor: '#86efac', backgroundColor: 'rgba(134, 239, 172, 0.15)', tension: 0.4, fill: true },
            ],
        };
    }, [orderTrend, chartType]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2>Orders Trend</h2>
                <div className="dashboard-card-header-actions">
                    <div className="dashboard-chart-type-toggle">
                        <button type="button" className={`dashboard-chart-type-btn${chartType === 'line' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setChartType('line')} title="Line chart">
                            <MdOutlineShowChart size={16} />
                        </button>
                        <button type="button" className={`dashboard-chart-type-btn${chartType === 'bar' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setChartType('bar')} title="Bar chart">
                            <MdOutlineBarChart size={16} />
                        </button>
                    </div>
                    <Dropdown
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.value)}
                        options={['This Month', 'Last Month', 'Last 3 Months']}
                        className="dashboard-month-dropdown dashboard-month-dropdown--sm"
                    />
                </div>
            </div>
            <Chart
                key={`trend-${monthFilter}-${chartType}-${bomList.length}`}
                type={chartType}
                data={chartData}
                options={trendChartOptions}
                className="dashboard-chart"
            />
        </div>
    );
};
export default OrdersTrend;
