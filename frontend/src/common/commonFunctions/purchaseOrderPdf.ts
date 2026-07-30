import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrder } from '../../services/purchaseOrderService';
import type { Vendor } from '../../services/vendorService';

const formatCurrency = (value: number): string => `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const COLOR = {
    title: [30, 41, 59] as const,
    subtitle: [100, 116, 139] as const,
    badgeText: [37, 99, 235] as const,
    badgeBg: [219, 234, 254] as const,
    label: [148, 163, 184] as const,
    body: [51, 65, 85] as const,
    totals: [71, 85, 105] as const,
    border: [226, 232, 240] as const,
};

const MARGIN = 14;
const PAGE_WIDTH = 210;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = RIGHT_EDGE - MARGIN;

export function exportPurchaseOrderPdf(po: PurchaseOrder, vendor?: Vendor): void {
    const doc = new jsPDF();
    let y = 22;

    const sectionLabel = (label: string, atY: number, atX: number = MARGIN) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR.label);
        doc.text(label.toUpperCase(), atX, atY);
    };

    // Header: title + PO No. on the left, status badge on the right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLOR.title);
    doc.text('Purchase Order', MARGIN, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.subtitle);
    doc.text(`#${po.poNo}`, MARGIN, y + 7);

    const badgeWidth = doc.getTextWidth(po.status) + 10;
    doc.setFillColor(...COLOR.badgeBg);
    doc.roundedRect(RIGHT_EDGE - badgeWidth, y - 8, badgeWidth, 8, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.badgeText);
    doc.text(po.status, RIGHT_EDGE - badgeWidth / 2, y - 3, { align: 'center' });

    y += 18;

    // Vendor section
    sectionLabel('Vendor', y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.title);
    doc.text(po.vendorName, MARGIN, y);
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR.body);
    const vendorDetailLines = [vendor?.email, vendor?.phoneNumber, vendor?.address && (vendor.city ? `${vendor.address}, ${vendor.city}` : vendor.address)].filter(Boolean) as string[];
    vendorDetailLines.forEach((line) => {
        doc.text(line, MARGIN, y);
        y += 5;
    });

    y += 5;

    // Delivery Address section
    if (po.deliveryAddress) {
        sectionLabel('Delivery Address', y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR.body);
        const addressLines = doc.splitTextToSize(po.deliveryAddress, CONTENT_WIDTH);
        doc.text(addressLines, MARGIN, y);
        y += addressLines.length * 5 + 8;
    }

    // PO Date / Expected Delivery row
    sectionLabel('PO Date', y);
    sectionLabel('Expected Delivery', y, MARGIN + 90);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.body);
    doc.text(formatDate(po.poDate), MARGIN, y);
    doc.text(formatDate(po.expectedDeliveryDate), MARGIN + 90, y);
    y += 10;

    // Items table
    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Item', 'Qty', 'Rate', 'Total']],
        body: po.items.map((item) => [
            item.itemName,
            String(item.orderedQty),
            formatCurrency(item.unitPrice),
            formatCurrency(item.orderedQty * item.unitPrice),
        ]),
        theme: 'plain',
        styles: { fontSize: 9.5, textColor: [...COLOR.body], cellPadding: { top: 3, bottom: 3, left: 0, right: 0 } },
        headStyles: {
            fontStyle: 'bold',
            fontSize: 8,
            textColor: [...COLOR.label],
            lineWidth: { bottom: 0.2 },
            lineColor: [...COLOR.border],
        },
        bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [...COLOR.border] },
        columnStyles: {
            1: { halign: 'left' },
            2: { halign: 'left' },
            3: { halign: 'left' },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 20;
    y += 8;

    doc.setDrawColor(...COLOR.border);
    doc.line(MARGIN, y, RIGHT_EDGE, y);
    y += 7;

    const totalsRows: [string, string][] = [
        ['Sub Total', formatCurrency(po.subTotal)],
        ['Discount', `- ${formatCurrency(po.discountAmount)}`],
        ['GST', `+ ${formatCurrency(po.gstAmount)}`],
        ['Freight', `+ ${formatCurrency(po.freightCharge)}`],
        ['Other Charges', `+ ${formatCurrency(po.otherCharges)}`],
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.totals);
    totalsRows.forEach(([label, value]) => {
        doc.text(label, MARGIN, y);
        doc.text(value, RIGHT_EDGE, y, { align: 'right' });
        y += 6.5;
    });

    doc.setDrawColor(...COLOR.border);
    doc.line(MARGIN, y, RIGHT_EDGE, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR.title);
    doc.text('Grand Total', MARGIN, y);
    doc.text(formatCurrency(po.grandTotal), RIGHT_EDGE, y, { align: 'right' });
    y += 12;

    if (po.remarks) {
        sectionLabel('Remarks', y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLOR.body);
        const remarksLines = doc.splitTextToSize(po.remarks, CONTENT_WIDTH);
        doc.text(remarksLines, MARGIN, y);
        y += remarksLines.length * 5;
    }

    // Outer card border, drawn last so it frames the finished content without covering it
    doc.setDrawColor(...COLOR.border);
    doc.roundedRect(MARGIN - 4, 10, CONTENT_WIDTH + 8, y - 10 + 6, 3, 3, 'S');

    doc.save(`${po.poNo}.pdf`);
}
