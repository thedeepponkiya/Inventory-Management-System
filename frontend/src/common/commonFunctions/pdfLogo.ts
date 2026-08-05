import type jsPDF from 'jspdf';

// Draws the company logo (if set, via Settings > Appearance) inside a maxSize x maxSize mm
// box at (x, y), preserving its aspect ratio using jsPDF's own getImageProperties. Returns
// the rendered width so callers can shift adjacent header text over to make room for it, or
// 0 when no logo is set (callers should leave the header layout unchanged in that case).
export function drawPdfLogo(doc: jsPDF, logoDataUrl: string | null | undefined, x: number, y: number, maxSize: number = 16): number {
    if (!logoDataUrl) return 0;
    try {
        const props = doc.getImageProperties(logoDataUrl);
        const ratio = props.width / props.height;
        const width = ratio >= 1 ? maxSize : maxSize * ratio;
        const height = ratio >= 1 ? maxSize / ratio : maxSize;
        doc.addImage(logoDataUrl, props.fileType, x, y, width, height);
        return width;
    } catch {
        // Corrupt/unsupported image data - skip the logo rather than breaking PDF generation.
        return 0;
    }
}
