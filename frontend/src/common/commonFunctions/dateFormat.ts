import { format, isValid, parseISO } from 'date-fns';

// Global date-display preference, set in Settings > General and applied everywhere a
// stored date is rendered as read-only text (table columns) - see DateFormatContext.tsx.
export type DateFormatOption = 'short' | 'medium' | 'long';

const DATE_PATTERNS: Record<DateFormatOption, string> = {
    short: 'dd/MM/yyyy',
    medium: 'dd MMM yyyy',
    long: 'dd MMMM yyyy',
};

// Every stored date this app renders comes back from Postgres as an ISO string (see the
// DATE/TIMESTAMPTZ-as-string quirks already handled across the *Service.ts normalizers) -
// parseISO handles both a plain "2026-08-03" and a full "2026-08-03T18:30:00.000Z".
export function formatDate(value: string | null | undefined, option: DateFormatOption): string {
    if (!value) return '';
    const date = parseISO(value);
    if (!isValid(date)) return String(value);
    return format(date, DATE_PATTERNS[option]);
}
