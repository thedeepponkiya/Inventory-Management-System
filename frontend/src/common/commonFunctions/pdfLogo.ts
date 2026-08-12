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

// drawPdfLogo only returns the rendered WIDTH (it draws the logo inside a maxSize x maxSize
// box but discards the aspect-ratio-derived height once drawn). A wide/short logo - like a
// wordmark - then only occupies a fraction of that box vertically, so blindly reserving the
// full maxSize before stacking text below it leaves a large dead gap. This mirrors
// drawPdfLogo's own aspect-ratio math to recover the logo's true rendered height instead.
export function getLogoRenderedHeight(doc: jsPDF, logoDataUrl: string | null | undefined, maxSize: number): number {
    if (!logoDataUrl) return 0;
    try {
        const props = doc.getImageProperties(logoDataUrl);
        const ratio = props.width / props.height;
        return ratio >= 1 ? maxSize / ratio : maxSize;
    } catch {
        return 0;
    }
}

// A lot of uploaded brand logos carry a chunk of fully-transparent padding baked into the file
// itself (space around the mark left by whatever tool exported it). drawPdfLogo places the
// *raw* image's bounding box flush against the header margin, so that baked-in padding pushes
// the visibly-drawn logo noticeably right of the company name/address text below it, even
// though both are technically "left-aligned" at the same x. This decodes a PNG logo on an
// offscreen canvas, finds the bounding box of its actually-opaque pixels, and returns a
// re-cropped data URL so the *visible* mark - not just the file's raw canvas - lines up with
// the text underneath. Non-PNG images (no alpha channel to inspect) are returned unchanged,
// since there's no safe way to guess where a background "ends" without one.
export async function trimTransparentLogoPadding(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:image/png')) return dataUrl;
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('logo image failed to load'));
            image.src = dataUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width === 0 || canvas.height === 0) return dataUrl;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const ALPHA_THRESHOLD = 10;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const alpha = data[(py * width + px) * 4 + 3];
                if (alpha > ALPHA_THRESHOLD) {
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                }
            }
        }
        // Fully transparent image, or already tight to its own edges - nothing to trim.
        if (maxX < 0 || (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1)) {
            return dataUrl;
        }

        const trimmedWidth = maxX - minX + 1;
        const trimmedHeight = maxY - minY + 1;
        const trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = trimmedWidth;
        trimmedCanvas.height = trimmedHeight;
        const trimmedCtx = trimmedCanvas.getContext('2d');
        if (!trimmedCtx) return dataUrl;
        trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
        return trimmedCanvas.toDataURL('image/png');
    } catch {
        // Decode failure (corrupt data, unsupported format, etc.) - fall back to the
        // untrimmed logo rather than breaking PDF export over a cosmetic crop.
        return dataUrl;
    }
}
