import type { RefObject } from 'react';
import type { Toast } from 'primereact/toast';
import { API_HOST } from '../../services/apiConfig';

export function showToast(toastRef: RefObject<Toast | null>,severity: 'success' | 'info' | 'warn' | 'error',summary: string,detail: string,life = 3000,): void {
    toastRef.current?.show({ severity, summary, detail, life });
}

// Uploaded product images (see inventoryService.ts's uploadProductImage) are saved to disk
// on the backend, with only the relative path (e.g. /uploads/products/xxx.jpg) persisted in
// the DB/frontend state - this resolves that into a full URL the browser can load. Absolute
// URLs (http(s):, blob:, data:) pass through unchanged.
export function resolveImageUrl(path: string): string {
    if (!path) return path;
    if (/^(https?:|blob:|data:)/.test(path)) return path;
    return `${API_HOST}${path}`;
}