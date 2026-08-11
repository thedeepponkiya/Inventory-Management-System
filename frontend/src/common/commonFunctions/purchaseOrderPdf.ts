import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';
import { drawPdfLogo } from './pdfLogo';

const formatCurrency = (value: number): string => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const COLOR = {
    navy: [15, 23, 42] as const,
    blue: [37, 99, 235] as const,
    blueLight: [219, 234, 254] as const,
    label: [100, 116, 139] as const,
    body: [51, 65, 85] as const,
    muted: [148, 163, 184] as const,
    border: [226, 232, 240] as const,
    danger: [220, 38, 38] as const,
    success: [22, 163, 74] as const,
    white: [255, 255, 255] as const,
};

// Sent/Received/Cancelled/Draft each get a distinct badge tint - same "status drives color"
// convention as the app's own StatusBadge component, just re-expressed in jsPDF's own
// fill/text-color API since there's no shared component to reuse across the two renderers.
const STATUS_COLOR: Record<PurchaseOrderStatus, { bg: readonly [number, number, number]; text: readonly [number, number, number] }> = {
    Draft: { bg: [226, 232, 240], text: [71, 85, 105] },
    Sent: { bg: [219, 234, 254], text: [37, 99, 235] },
    Received: { bg: [220, 252, 231], text: [22, 163, 74] },
    Cancelled: { bg: [254, 226, 226], text: [220, 38, 38] },
};

const MARGIN = 16;
const PAGE_WIDTH = 210;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = RIGHT_EDGE - MARGIN;
const CENTER_X = PAGE_WIDTH / 2;

export function exportPurchaseOrderPdf(po: PurchaseOrder, vendor?: Vendor, logoDataUrl?: string | null, companySettings?: { companyName: string; address: string }): void {
    const doc = new jsPDF();
    let y = 24;

    const sectionLabel = (label: string, atX: number, atY: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR.blue);
        doc.text(label.toUpperCase(), atX, atY);
    };

    // ---- Header: logo only (left) - no company name text alongside it, so the logo can run
    // bigger without the two competing for the same header row - big centered title, status
    // badge (right). ----
    drawPdfLogo(doc, logoDataUrl, MARGIN, MARGIN - 6, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLOR.navy);
    doc.text('PURCHASE ORDER', CENTER_X, y, { align: 'center' });

    const statusColors = STATUS_COLOR[po.status];
    const badgeLabel = po.status.toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const badgeWidth = doc.getTextWidth(badgeLabel) + 16;
    const badgeX = RIGHT_EDGE - badgeWidth;
    doc.setFillColor(...statusColors.bg);
    doc.roundedRect(badgeX, MARGIN - 6, badgeWidth, 9, 4.5, 4.5, 'F');
    doc.setTextColor(...statusColors.text);
    doc.text(badgeLabel, badgeX + badgeWidth / 2, MARGIN - 0.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.label);
    doc.text(formatDate(po.poDate), badgeX + badgeWidth / 2, MARGIN + 6, { align: 'center' });

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.blue);
    doc.text(`#${po.poNo}`, CENTER_X, y, { align: 'center' });

    // Small decorative divider (line - dot - dot - dot - line), purely cosmetic.
    y += 5;
    doc.setDrawColor(...COLOR.blue);
    doc.setLineWidth(0.3);
    doc.line(CENTER_X - 24, y, CENTER_X - 6, y);
    doc.line(CENTER_X + 6, y, CENTER_X + 24, y);
    doc.setFillColor(...COLOR.blue);
    doc.circle(CENTER_X - 3, y, 0.6, 'F');
    doc.circle(CENTER_X, y, 0.9, 'F');
    doc.circle(CENTER_X + 3, y, 0.6, 'F');

    y += 10;
    const colRightX = MARGIN + CONTENT_WIDTH / 2 + 6;
    const colLeftTop = y;

    // ---- Left column: company address + vendor details ----
    if (companySettings?.address) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLOR.muted);
        const companyAddrLines = doc.splitTextToSize(companySettings.address, CONTENT_WIDTH / 2 - 10);
        doc.text(companyAddrLines, MARGIN, y);
        y += companyAddrLines.length * 4 + 6;
    }

    sectionLabel('Vendor Details', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...COLOR.navy);
    doc.text(po.vendorName, MARGIN, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.body);
    const vendorLines = [
        vendor?.email,
        vendor?.phoneNumber,
        vendor?.address && (vendor.city ? `${vendor.address}, ${vendor.city}` : vendor.address),
    ].filter(Boolean) as string[];
    vendorLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH / 2 - 10);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 4.6;
    });
    const leftColBottom = y;

    // ---- Right column: PO Date / Expected Delivery / Payment Terms, each divided by a rule ----
    let ry = colLeftTop;
    const rightRow = (label: string, value: string) => {
        sectionLabel(label, colRightX, ry);
        ry += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR.body);
        doc.text(value, colRightX, ry);
        ry += 4;
        doc.setDrawColor(...COLOR.border);
        doc.setLineWidth(0.2);
        doc.line(colRightX, ry, RIGHT_EDGE, ry);
        ry += 6.5;
    };
    rightRow('PO Date', formatDate(po.poDate));
    rightRow('Expected Delivery', formatDate(po.expectedDeliveryDate));

    y = Math.max(leftColBottom, ry) + 6;

    if (po.deliveryAddress) {
        sectionLabel('Delivery Address', MARGIN, y);
        y += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLOR.body);
        const addrLines = doc.splitTextToSize(po.deliveryAddress, CONTENT_WIDTH);
        doc.text(addrLines, MARGIN, y);
        y += addrLines.length * 4.6 + 4;
    }
    y += 4;

    // ---- Items table: solid blue header, matching the reference design ----
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['#', 'Item Description', 'Qty', 'Unit', 'Rate (Rs.)', 'Total (Rs.)']],
        body: po.items.map((item, index) => [
            String(index + 1),
            item.itemName,
            String(item.orderedQty),
            item.unit,
            formatCurrency(item.unitPrice),
            formatCurrency(item.orderedQty * item.unitPrice),
        ]),
        theme: 'plain',
        styles: { fontSize: 9, textColor: [...COLOR.body], cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 } },
        headStyles: {
            fillColor: [...COLOR.blue],
            textColor: [...COLOR.white],
            fontStyle: 'bold',
            fontSize: 8.5,
        },
        bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [...COLOR.border] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'left' },
            2: { halign: 'left' },
            3: { halign: 'left' },
            4: { halign: 'left' },
            5: { halign: 'left' },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEndY = ((doc as any).lastAutoTable?.finalY ?? y + 20) + 10;

    // ---- Notes: flows normally right after the table (not pinned to the bottom - Grand
    // Total/footer are, see below, but Notes has no fixed "always here" spot in the reference
    // design and a long remark shouldn't collide with the anchored block underneath it). ----
    if (po.remarks) {
        let notesY = tableEndY;
        sectionLabel('Notes', MARGIN, notesY);
        notesY += 5.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLOR.body);
        const remarksLines = doc.splitTextToSize(po.remarks, CONTENT_WIDTH / 2 - 10);
        doc.text(remarksLines, MARGIN, notesY);
    }

    // ---- Totals + footer anchored near the bottom of the page, regardless of how short the
    // item table is - falls back to flowing right after the table (via the Math.max) instead
    // of overlapping it when there are enough items to reach that far down on their own. ----
    const totalsBoxWidth = 78;
    const totalsBoxX = RIGHT_EDGE - totalsBoxWidth;
    let ty = Math.max(226, tableEndY);
    const totalsRow = (label: string, value: string, color: readonly [number, number, number] = COLOR.body) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLOR.body);
        doc.text(label, totalsBoxX, ty);
        doc.setTextColor(...color);
        doc.text(value, RIGHT_EDGE, ty, { align: 'right' });
        ty += 6.5;
    };
    totalsRow('Sub Total', formatCurrency(po.subTotal));
    totalsRow('Discount', `- ${formatCurrency(po.discountAmount)}`, COLOR.danger);
    totalsRow('GST', `+ ${formatCurrency(po.gstAmount)}`, COLOR.success);
    ty += 1;

    doc.setFillColor(...COLOR.blueLight);
    doc.roundedRect(totalsBoxX, ty - 5.5, totalsBoxWidth, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.blue);
    doc.text('Grand Total', totalsBoxX + 3, ty + 1.5);
    doc.text(formatCurrency(po.grandTotal), RIGHT_EDGE - 3, ty + 1.5, { align: 'right' });
    ty += 12;

    // ---- Footer: prepared by | authorized signature | for {company} ----
    const footerDividerY = Math.max(266, ty + 8);
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, footerDividerY, RIGHT_EDGE, footerDividerY);
    const footerY = footerDividerY + 8;

    sectionLabel('Prepared By', MARGIN, footerY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.navy);
    doc.text(po.createdBy || '—', MARGIN, footerY + 5.5);

    doc.setDrawColor(...COLOR.muted);
    doc.setLineWidth(0.2);
    doc.line(CENTER_X - 22, footerY + 6, CENTER_X + 22, footerY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.muted);
    doc.text('Authorized Signature', CENTER_X, footerY + 10, { align: 'center' });

    if (companySettings?.companyName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR.blue);
        doc.text(`FOR ${companySettings.companyName.toUpperCase()}`, RIGHT_EDGE, footerY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR.body);
        doc.text(companySettings.companyName, RIGHT_EDGE, footerY + 5.5, { align: 'right' });
    }

    // Outer card border, drawn last so it frames the finished content on this page without
    // covering it - matches the reference image's full-page bordered layout.
    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(6, 6, PAGE_WIDTH - 12, Math.min(footerY + 14, 289) - 6, 3, 3, 'S');

    doc.save(`${po.poNo}.pdf`);
}
