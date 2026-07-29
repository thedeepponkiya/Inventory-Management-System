import type { RefObject } from 'react';
import type { Toast } from 'primereact/toast';

export function showToast(toastRef: RefObject<Toast | null>,severity: 'success' | 'info' | 'warn' | 'error',summary: string,detail: string,life = 3000,): void {
    toastRef.current?.show({ severity, summary, detail, life });
}