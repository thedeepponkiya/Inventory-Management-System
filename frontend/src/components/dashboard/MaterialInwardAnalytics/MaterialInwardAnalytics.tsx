import { useContext, useMemo, useState } from 'react';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import { MdOutlineBarChart, MdOutlineShowChart } from 'react-icons/md';
import { HiOutlineTruck } from 'react-icons/hi2';
import { AppContext } from '../../../context/AppContextDefinition';
import type { MaterialInward } from '../../../services/materialInwardService';
import { buildTrendBuckets, countByBucket, isSameMonth, trendChartOptions } from '../dashboardUtils';
import '../Dashboard.css';

const MaterialInwardAnalytics = () => {
    const { materialInwards } = useContext(AppContext);
    const materialInwardList = materialInwards as MaterialInward[];
    const [inwardTrendChartType, setInwardTrendChartType] = useState<'line' | 'bar'>('line');
    const [inwardTrendFilter, setInwardTrendFilter] = useState('Last 3 Months');

    const totalInwards = materialInwardList.length;
    const totalInwardValue = useMemo(() => materialInwardList.reduce((sum, mi) => sum + mi.grandTotal, 0), [materialInwardList]);
    const inwardsThisMonth = useMemo(() => {
        const now = new Date();
        return materialInwardList.filter((mi) => isSameMonth(new Date(mi.receivedDate), now)).length;
    }, [materialInwardList]);
    const poLinkedInwardsPercent = useMemo(() => {
        if (materialInwardList.length === 0) return 0;
        const linked = materialInwardList.filter((mi) => mi.purchaseOrderId !== null).length;
        return Math.round((linked / materialInwardList.length) * 100);
    }, [materialInwardList]);

    const inwardTrend = useMemo(() => {
        const buckets = buildTrendBuckets(inwardTrendFilter);
        const receivedDates = materialInwardList.map((mi) => new Date(mi.receivedDate));
        return { labels: buckets.map((bucket) => bucket.label), counts: countByBucket(receivedDates, buckets) };
    }, [inwardTrendFilter, materialInwardList]);

    const inwardChartData = useMemo(() => {
        if (inwardTrendChartType === 'bar') {
            return { labels: inwardTrend.labels, datasets: [{ label: 'Material Inwards', data: inwardTrend.counts, backgroundColor: '#c4b5fd', borderRadius: 4 }] };
        }
        return {
            labels: inwardTrend.labels,
            datasets: [{ label: 'Material Inwards', data: inwardTrend.counts, borderColor: '#c4b5fd', backgroundColor: 'rgba(196, 181, 253, 0.15)', tension: 0.4, fill: true }],
        };
    }, [inwardTrend, inwardTrendChartType]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineTruck size={18} className="dashboard-card-header-icon" />Material Inward Analytics</h2>
                <div className="dashboard-card-header-actions">
                    <div className="dashboard-chart-type-toggle">
                        <button type="button" className={`dashboard-chart-type-btn${inwardTrendChartType === 'line' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setInwardTrendChartType('line')} title="Line chart">
                            <MdOutlineShowChart size={16} />
                        </button>
                        <button type="button" className={`dashboard-chart-type-btn${inwardTrendChartType === 'bar' ? ' dashboard-chart-type-btn--active' : ''}`} onClick={() => setInwardTrendChartType('bar')} title="Bar chart">
                            <MdOutlineBarChart size={16} />
                        </button>
                    </div>
                    <Dropdown
                        value={inwardTrendFilter}
                        onChange={(e) => setInwardTrendFilter(e.value)}
                        options={['This Month', 'Last Month', 'Last 3 Months']}
                        className="dashboard-month-dropdown dashboard-month-dropdown--sm"
                    />
                </div>
            </div>
            <div className="dashboard-stock-summary">
                <div>
                    <div className="dashboard-stock-summary-label">Total Inwards</div>
                    <div className="dashboard-stock-summary-value">{totalInwards}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">Total Inward Value</div>
                    <div className="dashboard-stock-summary-value">Rs. {totalInwardValue.toLocaleString('en-IN')}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">This Month</div>
                    <div className="dashboard-stock-summary-value">{inwardsThisMonth}</div>
                </div>
                <div>
                    <div className="dashboard-stock-summary-label">PO-Linked</div>
                    <div className="dashboard-stock-summary-value">{poLinkedInwardsPercent}%</div>
                </div>
            </div>
            <Chart
                key={`inward-trend-${inwardTrendFilter}-${inwardTrendChartType}-${materialInwardList.length}`}
                type={inwardTrendChartType}
                data={inwardChartData}
                options={trendChartOptions}
                className="dashboard-analytics-chart"
            />
        </div>
    );
};
export default MaterialInwardAnalytics;
