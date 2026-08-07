export const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'This Year', 'Last Week', 'Last Month', 'Last Year'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// Monday-start week. "This X" spans start-of-period through now; "Last X" is the full
// preceding period. Shared by the Dashboard's "Leads by Stage"/"Leads by Source" period
// filters and the Leads page's own date filter, so all three stay consistent.
export function getPeriodRange(period: string): { start: Date; end: Date } {
    const now = new Date();

    if (period === 'Today') {
        return { start: startOfDay(now), end: endOfDay(now) };
    }

    if (period === 'This Week' || period === 'Last Week') {
        const dayIndex = now.getDay();
        const diffToMonday = (dayIndex + 6) % 7;
        const thisMonday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday));
        if (period === 'This Week') {
            return { start: thisMonday, end: endOfDay(now) };
        }
        const lastMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
        const lastSunday = endOfDay(new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6));
        return { start: lastMonday, end: lastSunday };
    }

    if (period === 'This Month' || period === 'Last Month') {
        if (period === 'This Month') {
            return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
        }
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    }

    if (period === 'This Year') {
        return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    }

    // Last Year
    return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) };
}
