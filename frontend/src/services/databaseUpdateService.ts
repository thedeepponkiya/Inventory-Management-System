import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

const CONFIRM_PHRASE = 'UPDATE';

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export interface DatabaseUpdateResult {
    backupFile: string;
    backupSizeBytes: number;
}

export interface PendingSchemaChanges {
    newTables: string[];
    // Called out separately from newTables/newColumns/renamedColumns, alongside
    // removedColumns below - unlike those, this and removedColumns are the two categories that
    // can actually discard data (a table/column schema.sql wants dropped, if it still exists
    // and still holds values on this database). See databaseSchemaPreview.util.js's own
    // comment for the full reasoning.
    droppedTables: string[];
    newColumns: { table: string; column: string }[];
    removedColumns: { table: string; column: string }[];
    // A column relaxed from NOT NULL to nullable - purely additive (an existing value is never
    // touched, only the requirement to always have one is lifted), same trust level as
    // newColumns/newTables, not the droppedTables/removedColumns risky category.
    nullableColumns: { table: string; column: string }[];
    renamedColumns: { table: string; fromColumn: string; toColumn: string }[];
    newIndexes: { indexName: string; table: string }[];
}

// Read-only diff of schema.sql against the live database, computed purely from
// information_schema reads - nothing is applied. Shown in the confirm dialog before the admin
// decides whether to actually run updateDatabase below.
export async function previewDatabaseUpdate(): Promise<PendingSchemaChanges> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin/database-update/preview`);
    const result: ApiResponse<PendingSchemaChanges> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Failed to load the pending changes preview');
    }
    return result.data;
}

// Takes a pg_dump backup first, then applies backend/src/db/schema.sql - unlike
// databaseResetService.ts's resetDatabase, this never deletes or overwrites existing rows:
// schema.sql is entirely CREATE TABLE IF NOT EXISTS / ALTER TABLE ... ADD COLUMN IF NOT
// EXISTS / guarded rename blocks, so re-running it only adds whatever tables/columns this
// database doesn't already have. Server-side gated to the one hidden Super Admin account
// regardless of what the frontend shows/hides.
export async function updateDatabase(): Promise<DatabaseUpdateResult> {
    const response = await authFetch(`${API_BASE_URL}/developer-admin/database-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
    });
    const result: ApiResponse<DatabaseUpdateResult> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Failed to update database');
    }
    return result.data;
}
