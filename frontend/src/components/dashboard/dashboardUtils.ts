export const pieColors = ['#93c5fd', '#86efac', '#fcd34d', '#c4b5fd', '#fca5a5', '#7dd3fc', '#fdba74', '#f9a8d4', '#cbd5e1'];

export function isSameMonth(date: Date, ref: Date): boolean {
    return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

export interface TrendBucket {
    label: string;
    start: Date;
    end: Date;
}

// Buckets the selected range into days (This Month / Last Month) or months (Last 3 Months) -
// used to turn raw timestamps into a real, filter-driven trend line.
export function buildTrendBuckets(monthFilter: string): TrendBucket[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (monthFilter === 'Last 3 Months') {
        const buckets: TrendBucket[] = [];
        for (let i = 2; i >= 0; i -= 1) {
            const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
            buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), start, end });
        }
        return buckets;
    }

    const monthOffset = monthFilter === 'Last Month' ? 1 : 0;
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const monthEnd = monthOffset === 0 ? today : new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0, 23, 59, 59, 999);

    const buckets: TrendBucket[] = [];
    const cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
        const start = new Date(cursor);
        const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
        buckets.push({ label: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), start, end });
        cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
}

export function countByBucket(dates: Date[], buckets: TrendBucket[]): number[] {
    return buckets.map(({ start, end }) => dates.filter((date) => date >= start && date <= end).length);
}

// Shared "This Month / Last Month / Last 3 Months" range resolver - for filters that need a
// single start/end window rather than per-bucket counts (e.g. SKU Movement).
export function getFilterRange(filter: string): { start: Date; end: Date } {
    const now = new Date();
    if (filter === 'Last Month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end };
    }
    if (filter === 'Last 3 Months') {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return { start, end: now };
    }
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
}

// At/below 40% of min stock = critical (red), otherwise still low but less urgent (orange).
export function getStockSeverityColor(currentStock: number, minStock: number): string {
    const ratio = minStock > 0 ? currentStock / minStock : 0;
    return ratio <= 0.4 ? 'var(--accent-danger-text)' : 'var(--accent-warning-text)';
}

// Shared line/bar options for the two trend charts (Orders Trend, Material Inward Analytics).
export const trendChartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, align: 'end' as const } },
    scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
    },
};
