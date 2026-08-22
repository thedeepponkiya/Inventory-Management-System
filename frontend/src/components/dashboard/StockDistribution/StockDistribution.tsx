import { useContext, useMemo, useState } from 'react';
import { Chart } from 'primereact/chart';
import { Dropdown } from 'primereact/dropdown';
import type { Chart as ChartJSInstance } from 'chart.js';
import { MdOutlineDonutLarge, MdOutlinePieChart, MdOutlineBarChart } from 'react-icons/md';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { AppContext } from '../../../context/AppContextDefinition';
import type { InventoryItem } from '../../../services/inventoryService';
import { pieColors } from '../dashboardUtils';
import '../Dashboard.css';
import './StockDistribution.css';

const StockDistribution = () => {
    const { inventories } = useContext(AppContext);
    const inventoryList = inventories as InventoryItem[];
    const [distributionView, setDistributionView] = useState<'donut' | 'pie' | 'bar'>('donut');
    // null = "All Locations" (no filter) - the dropdown's own default/cleared state.
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    // Every distinct location name across ALL inventory, independent of the filter below - so
    // picking one location doesn't shrink the dropdown's own option list down to just itself.
    const locationOptions = useMemo(() => {
        const names = new Set<string>();
        inventoryList.forEach((item) => names.add(item.locationName ?? 'Unassigned'));
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [inventoryList]);

    const filteredInventoryList = useMemo(
        () => (selectedLocation ? inventoryList.filter((item) => (item.locationName ?? 'Unassigned') === selectedLocation) : inventoryList),
        [inventoryList, selectedLocation],
    );

    // Every real location, by name - no top-N folding into "Other" anymore. The legend
    // below is a scrollable HTML list (not Chart.js's own canvas-drawn legend), so showing
    // all of them doesn't turn into an unreadable wall of text like it would inside the
    // chart itself.
    const locationEntries = useMemo(() => {
        const totals = new Map<string, number>();
        filteredInventoryList.forEach((item) => {
            const locationName = item.locationName ?? 'Unassigned';
            totals.set(locationName, (totals.get(locationName) ?? 0) + 1);
        });
        return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    }, [filteredInventoryList]);

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

    // Chart.js's own legend is canvas-drawn, so it can't scroll - the location list is
    // rendered as a separate HTML legend instead (below), so both pie/donut hide the
    // built-in one here.
    const sliceOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: { label?: string; parsed: number }) => `${context.label}: ${context.parsed} SKU`,
                },
            },
        },
    };

    const donutOptions = { ...sliceOptions, cutout: '68%' };

    const renderLegend = () => (
        <div className="dashboard-location-legend">
            {locationEntries.map(([label, value], index) => (
                <div className="dashboard-location-legend-item" key={label}>
                    <span className="dashboard-location-legend-swatch" style={{ background: locationColors[index] }} />
                    <span className="dashboard-location-legend-label">{label}</span>
                    <span className="dashboard-location-legend-count">{value} SKU</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <h2><HiOutlineMapPin size={18} className="dashboard-card-header-icon" />Location Wise SKU</h2>
                <div className="dashboard-card-header-actions">
                    <Dropdown
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.value)}
                        options={locationOptions}
                        showClear
                        placeholder="All Locations"
                        className="dashboard-location-filter"
                    />
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
            </div>

            {distributionView === 'donut' && (
                <div className="dashboard-location-row">
                    <Chart key={`donut-${selectedLocation}-${filteredInventoryList.length}`} type="doughnut" data={donutData} options={donutOptions} plugins={[centerTextPlugin]} className="dashboard-pie-chart" />
                    {renderLegend()}
                </div>
            )}

            {distributionView === 'pie' && (
                <div className="dashboard-location-row">
                    <Chart key={`pie-${selectedLocation}-${filteredInventoryList.length}`} type="pie" data={pieData} options={sliceOptions} className="dashboard-pie-chart" />
                    {renderLegend()}
                </div>
            )}

            {distributionView === 'bar' && (
                <Chart key={`bar-${selectedLocation}-${filteredInventoryList.length}`} type="bar" data={barData} options={barOptions} className="dashboard-chart" />
            )}
        </div>
    );
};
export default StockDistribution;
