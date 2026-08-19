import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

const CONFIRM_PHRASE = 'RESET';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export interface DatabaseResetResult {
    tables: string[];
    backupFile: string;
    backupSizeBytes: number;
}

// Wipes every business/transactional record (orders, inventory, BOM, invoices, CRM leads,
// etc.) while keeping the "users" table and master data (Locations/Category/Product
// Type/Unit/Vendor/Customer) and CRM's settings-like tables (stages/sources/tags/meta
// integration) intact - the target list is computed dynamically on the backend from every
// table that actually exists minus that kept set (see
// backend/src/models/databaseReset.model.js's KEPT_TABLES/getTablesToReset), so a newly added
// table is included automatically without any code change here. Takes a pg_dump backup first
// (same mechanism as Database Update), so this is no longer truly unrecoverable, just no
// in-app "restore" button. Server-side gated to the
// one hidden Super Admin account regardless of what the frontend shows/hides.
export async function resetDatabase(): Promise<DatabaseResetResult> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin/database-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
    });
    const result: ApiResponse<DatabaseResetResult> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Failed to reset database');
    }
    return result.data;
}
