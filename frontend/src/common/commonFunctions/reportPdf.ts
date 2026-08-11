import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPdfLogo } from './pdfLogo';

const COLOR = {
    title: [30, 41, 59] as const,
    subtitle: [100, 116, 139] as const,
    label: [148, 163, 184] as const,
    body: [51, 65, 85] as const,
    border: [226, 232, 240] as const,
};

const MARGIN = 14;

// Generic "export a filtered table" PDF, shared by every report tab in Reports.tsx (mirrors
// CRM's crmReportPdf.ts, which does the same thing for the CRM Leads report) - deliberately
// skips the letterhead/totals-card boilerplate that purchaseOrderPdf.ts/bomPdf.ts use for
// single-document invoices, since this is always a multi-row report table, not a document.
export function exportReportPdf(
    title: string,
    filterSummary: string,
    head: string[],
    rows: (string | number)[][],
    filename: string,
    logoDataUrl?: string | null,
): void {
    const doc = new jsPDF();
    const logoWidth = drawPdfLogo(doc, logoDataUrl, MARGIN, 6, 14);
    const titleX = logoWidth ? MARGIN + logoWidth + 6 : MARGIN;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLOR.title);
    doc.text(title, titleX, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.subtitle);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, titleX, 25);
    doc.text(filterSummary, titleX, 31);

    autoTable(doc, {
        startY: 38,
        margin: { left: MARGIN, right: MARGIN },
        head: [head],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8.5, textColor: [...COLOR.body], cellPadding: { top: 3, bottom: 3, left: 0, right: 4 } },
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: [...COLOR.label], lineWidth: { bottom: 0.2 }, lineColor: [...COLOR.border] },
        bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [...COLOR.border] },
    });

    doc.save(filename);
}
