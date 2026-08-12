import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CrmLead } from '../types/lead.types';

const COLOR = {
    title: [30, 41, 59] as const,
    subtitle: [100, 116, 139] as const,
    label: [148, 163, 184] as const,
    body: [51, 65, 85] as const,
    border: [226, 232, 240] as const,
};

const MARGIN = 14;

const formatValue = (value: number): string => `Rs. ${value.toLocaleString('en-IN')}`;
const formatDate = (value: string): string => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Generic "export a filtered table" PDF - deliberately skips the letterhead/logo/totals-card
// boilerplate that purchaseOrderPdf.ts/bomPdf.ts use for single-document invoices, since this
// is a multi-row report table, not a document.
export function exportLeadsReportPdf(leads: CrmLead[], filterSummary: string): void {
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...COLOR.title);
    doc.text('CRM Leads Report', MARGIN, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.subtitle);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, MARGIN, 25);
    doc.text(filterSummary, MARGIN, 31);

    autoTable(doc, {
        startY: 38,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Lead Code', 'Name', 'Stage', 'Source', 'Campaign', 'Value', 'Status', 'Created']],
        body: leads.map((lead) => [
            lead.leadCode,
            lead.name,
            lead.stageName ?? '—',
            lead.sourceName ?? '—',
            lead.campaignName ?? '—',
            formatValue(lead.value),
            lead.status,
            formatDate(lead.createdAt),
        ]),
        theme: 'plain',
        styles: { fontSize: 8.5, textColor: [...COLOR.body], cellPadding: { top: 3, bottom: 3, left: 0, right: 4 } },
        headStyles: { fontStyle: 'bold', fontSize: 8, textColor: [...COLOR.label], lineWidth: { bottom: 0.2 }, lineColor: [...COLOR.border] },
        bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [...COLOR.border] },
    });

    doc.save('crm-leads-report.pdf');
}
