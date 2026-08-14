import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

const CONFIRM_PHRASE = 'RESET';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

// Wipes every business/transactional record (orders, inventory, BOM, invoices, CRM leads,
// etc.) while keeping the "users" table and master data (Locations/Category/Product
// Type/Unit/Vendor/Customer) and CRM's settings-like tables (stages/sources/tags/meta
// integration) intact - see backend/src/models/databaseReset.model.js's TABLES_TO_RESET for
// the exact list. Server-side gated to the one hidden Super Admin account regardless of what
// the frontend shows/hides.
export async function resetDatabase(): Promise<{ tables: string[] }> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin/database-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
    });
    const result: ApiResponse<{ tables: string[] }> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Failed to reset database');
    }
    return result.data;
}
