import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Bom } from '../../services/bomService';
import type { CompanySettings } from '../../context/CompanySettingsContextDefinition';
import type { RawSku } from '../../services/rawSkuService';

const COLOR = {
    title: [30, 41, 59] as const,
    subtitle: [100, 116, 139] as const,
    accent: [37, 99, 235] as const,
    accentBg: [219, 234, 254] as const,
    label: [148, 163, 184] as const,
    body: [51, 65, 85] as const,
    border: [226, 232, 240] as const,
};

const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

// Total needed for a production run of bom.outputQty units - same formula as the live
// "Qty Needed" preview column in CommonUtilities.tsx's getBomItemColumns.
function qtyNeeded(requiredQty: number, outputQty: number): number {
    return requiredQty * outputQty;
}

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Draws the plain logo image (no background fill, no border) right-aligned at rightX,
// scaled to fit within maxW x maxH while preserving aspect ratio. Returns the y-coordinate
// of the image's bottom edge (or the original y if there's no logo to draw).
function drawPlainLogo(doc: jsPDF, logoDataUrl: string | null | undefined, rightX: number, y: number, maxW: number, maxH: number): number {
    if (!logoDataUrl) return y;
    try {
        const props = doc.getImageProperties(logoDataUrl);
        const ratio = props.width / props.height;
        let w = maxW;
        let h = maxW / ratio;
        if (h > maxH) {
            h = maxH;
            w = maxH * ratio;
        }
        doc.addImage(logoDataUrl, props.fileType, rightX - w, y, w, h);
        return y + h;
    } catch {
        // Corrupt/unsupported image data - skip the logo rather than breaking PDF generation.
        return y;
    }
}

// Fakes rounded top corners on the table's colored header band: jsPDF/autoTable can't clip
// cell fills to a rounded shape, so each corner is masked back to the page background (white)
// and redrawn as a quarter-disk - a circle centered exactly r inside the corner never crosses
// the table's outer edge, so it can't bleed onto the page outside the table bounds.
function roundTableTopCorners(doc: jsPDF, x: number, y: number, w: number, r: number, fillColor: readonly [number, number, number]): void {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, r, r, 'F');
    doc.rect(x + w - r, y, r, r, 'F');
    doc.setFillColor(...fillColor);
    doc.circle(x + r, y + r, r, 'F');
    doc.circle(x + w - r, y + r, r, 'F');
}

function buildBomDoc(bom: Bom, logoDataUrl?: string | null, company?: CompanySettings | null, rawSkus?: RawSku[]): jsPDF {
    const doc = new jsPDF();

    // Letterhead: company name + address (from Settings) on the left, logo on the right -
    // both anchored to the same top y so they line up on the same row instead of the logo
    // floating above or below the company name block.
    const letterheadTop = 12;
    let y = letterheadTop + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR.title);
    doc.text(company?.companyName || 'Your Company', MARGIN, y);
    let leftBottom = y;
    if (company?.address) {
        const addressLines = doc.splitTextToSize(company.address, 90);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLOR.body);
        doc.text(addressLines, MARGIN, y + 6);
        leftBottom = y + 6 + (addressLines.length - 1) * 4.5;
    }

    const logoBottom = drawPlainLogo(doc, logoDataUrl, RIGHT_EDGE, letterheadTop, 32, 18);

    y = Math.max(leftBottom, logoBottom) + 14;

    // Centered title, matching the app's own page/dialog heading style.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...COLOR.accent);
    doc.text('Order Recipe', PAGE_WIDTH / 2, y, { align: 'center' });

    y += 16;

    // Two-column info row: Product on the left, Order ID / Order Date on the right.
    const infoY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.accent);
    doc.text('PRODUCT', MARGIN, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR.title);
    doc.text(`${bom.productName} (${bom.productSku})`, MARGIN, infoY + 6);
    let leftInfoBottom = infoY + 6;
    if (bom.categoryName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLOR.body);
        doc.text(bom.categoryName, MARGIN, infoY + 11.5);
        leftInfoBottom = infoY + 11.5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.accent);
    doc.text('ORDER ID', RIGHT_EDGE, infoY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR.title);
    doc.text(`#${bom.bomCode}`, RIGHT_EDGE, infoY + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.accent);
    doc.text('ORDER DATE', RIGHT_EDGE, infoY + 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.body);
    doc.text(formatDate(bom.createdAt), RIGHT_EDGE, infoY + 18.5, { align: 'right' });

    y = Math.max(leftInfoBottom, infoY + 18.5) + 10;
    const tableStartY = y;

    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Raw SKU', 'Location', 'Required Qty (per unit)', 'Qty Needed', 'Remarks']],
        body: bom.items.map((item) => [
            `${item.rawSkuCode} - ${item.rawSkuName}`,
            rawSkus?.find((sku) => sku.skuCode === item.rawSkuCode)?.locationName || '—',
            `${item.requiredQty} ${item.unit}`,
            `${Number(qtyNeeded(item.requiredQty, bom.outputQty).toFixed(2))} ${item.unit}`,
            item.remarks || '—',
        ]),
        theme: 'plain',
        styles: { fontSize: 9.5, textColor: [...COLOR.body], cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
        headStyles: {
            fillColor: [...COLOR.accent],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            // Extra left padding vs. the body rows - keeps header text clear of the rounded
            // top-left corner mask drawn after the table (see roundTableTopCorners).
            cellPadding: { top: 4, bottom: 4, left: 5, right: 3 },
        },
        bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [...COLOR.border] },
        columnStyles: {
            3: { textColor: [...COLOR.accent], fontStyle: 'bold' },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y + 20;

    const tableRadius = 2;
    const tableWidth = RIGHT_EDGE - MARGIN;
    roundTableTopCorners(doc, MARGIN, tableStartY, tableWidth, tableRadius, COLOR.accent);
    doc.setDrawColor(...COLOR.border);
    doc.roundedRect(MARGIN, tableStartY, tableWidth, y - tableStartY, tableRadius, tableRadius, 'S');

    y += 8;

    // Output Qty shown as a highlighted total row, mirroring an invoice's Total banner.
    doc.setFillColor(...COLOR.accentBg);
    doc.rect(MARGIN, y - 5.5, RIGHT_EDGE - MARGIN, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.title);
    doc.text('OUTPUT QTY', MARGIN + 4, y);
    doc.setTextColor(...COLOR.accent);
    doc.text(`${bom.outputQty} ${bom.unit}`, RIGHT_EDGE - 4, y, { align: 'right' });

    const footerY = PAGE_HEIGHT - 15;
    doc.setDrawColor(...COLOR.border);
    doc.line(MARGIN, footerY - 6, RIGHT_EDGE, footerY - 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.subtitle);
    doc.text(`Created Date: ${formatDate(bom.createdAt)}`, MARGIN, footerY);
    doc.text(`Created By: ${bom.createdBy || '—'}`, RIGHT_EDGE, footerY, { align: 'right' });

    return doc;
}

export function downloadBomPdf(bom: Bom, logoDataUrl?: string | null, company?: CompanySettings | null, rawSkus?: RawSku[]): void {
    buildBomDoc(bom, logoDataUrl, company, rawSkus).save(`${bom.bomCode}-Recipe.pdf`);
}

export function printBomPdf(bom: Bom, logoDataUrl?: string | null, company?: CompanySettings | null, rawSkus?: RawSku[]): void {
    const doc = buildBomDoc(bom, logoDataUrl, company, rawSkus);
    const blobUrl = doc.output('bloburl') as unknown as string;

    // A hidden iframe + contentWindow.print() is used instead of window.open(blobUrl) -
    // opening a PDF blob URL in a new tab is inconsistent across browsers (some show an
    // inline viewer and trigger the print dialog via autoPrint(), others just silently
    // download it instead), whereas printing an iframe's own content works reliably
    // everywhere without depending on the browser's PDF-viewer configuration.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    };
    document.body.appendChild(iframe);

    // Give the user plenty of time to interact with the print dialog before cleaning up.
    setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
    }, 60000);
}
