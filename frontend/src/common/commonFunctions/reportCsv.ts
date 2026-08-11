// Only quotes a cell when it actually needs it (contains a comma/quote/newline) - keeps
// plain numeric/short-text cells (the vast majority) readable in the raw file, matching how
// most spreadsheet tools write CSV themselves.
function escapeCsvCell(value: string | number): string {
    const text = String(value);
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

// Generic "export a filtered table" CSV, sharing the exact same (head, rows) shape every
// report tab in Reports.tsx already builds for exportReportPdf - so each tab's Export CSV
// button reuses the same data prep, no separate column mapping to keep in sync.
export function exportReportCsv(head: string[], rows: (string | number)[][], filename: string): void {
    const lines = [head, ...rows].map((row) => row.map(escapeCsvCell).join(','));
    // Leading BOM so Excel (which sniffs encoding, not just content) opens ₹/non-ASCII text
    // as UTF-8 instead of mangling it via its default locale codepage.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
