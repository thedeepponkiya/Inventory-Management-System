import { useContext, useMemo, useState } from 'react';
import { Chart } from 'primereact/chart';
import type { Chart as ChartJSInstance } from 'chart.js';
import { MdOutlineDonutLarge, MdOutlinePieChart, MdOutlineBarChart } from 'react-icons/md';
import { AppContext } from '../../../context/AppContextDefinition';
import type { InventoryItem } from '../../../services/inventoryService';
import { pieColors } from '../dashboardUtils';
import '../Dashboard.css';
import './StockDistribution.css';

const StockDistribution = () => {
    const { inventories } = useContext(AppContext);
    const inventoryList = inventories as InventoryItem[];
    const [distributionView, setDistributionView] = useState<'donut' | 'pie' | 'bar'>('donut');

    // Caps the chart/legend to the busiest locations - with hundreds of real locations now
    // seeded, showing one slice per location would produce an unreadable legend with
    // hundreds of entries, so anything past the top 9 gets folded into a single "Other" slice.
    const locationEntries = useMemo(() => {
        const totals = new Map<string, number>();
        inventoryList.forEach((item) => {
            const locationName = item.locationName ?? 'Unassigned';
            totals.set(locationName, (totals.get(locationName) ?? 0) + 1);
        });
        const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
        const TOP_N = 9;
        if (sorted.length <= TOP_N + 1) return sorted;
        const top = sorted.slice(0, TOP_N);
        const otherTotal = sorted.slice(TOP_N).reduce((sum, [, value]) => sum + value, 0);
        return [...top, ['Other', otherTotal] as [string, number]];
    }, [inventoryList]);

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

    return (
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
                <Chart key={`donut-${inventoryList.length}`} type="doughnut" data={donutData} options={donutOptions} plugins={[centerTextPlugin]} className="dashboard-pie-chart" />
            )}

            {distributionView === 'pie' && (
                <Chart key={`pie-${inventoryList.length}`} type="pie" data={pieData} options={pieOptions} className="dashboard-pie-chart" />
            )}

            {distributionView === 'bar' && (
                <Chart key={`bar-${inventoryList.length}`} type="bar" data={barData} options={barOptions} className="dashboard-chart" />
            )}
        </div>
    );
};
export default StockDistribution;
