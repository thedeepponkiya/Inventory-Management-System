import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

// A BOM has no single "Output Product" of its own anymore - every line here is itself an
// Inventory item (skuId matches ims_inventories.skuId) to be produced, completed
// independently of every other line in the same BOM (see Bom.tsx's expandable row + per-line
// Complete/Revert actions). `status` is server-computed and only ever changes via
// completeBomItem/revertBomItem below - never editable directly.
export interface BomItem {
    skuId: string;
    productName: string;
    requiredQty: number;
    unit: string;
    remarks: string;
    status: 'Pending' | 'Completed';
}

// BOM's own `status` is derived server-side from every line's own status (see
// bom.controller.js's computeBomStatus) - Process while nothing is Completed yet,
// "Partially Completed" once some (not all) lines are, Completed once every line is.
export type BomStatus = 'Process' | 'Partially Completed' | 'Completed';

export interface Bom {
    id: number;
    bomCode: string;
    version: string;
    status: BomStatus;
    items: BomItem[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    // Populated from whatever "cf_*" columns exist on ims_bom right now (see
    // customField.service.js) - the backend returns them as flat top-level keys (a plain
    // `SELECT *`), normalizeBom below nests them here so callers never need to know which
    // custom fields exist to type against them.
    customFields: Record<string, unknown>;
}

export interface BomPayload {
    // On create, the code previewed in the Add BOM dialog (via getNextBomCode), reused as-is
    // so the previewed code matches what actually gets saved. On update, an actual rename -
    // omit to leave the existing code untouched (bom.controller.js's updateBom re-checks
    // uniqueness only when this differs from the BOM's current code).
    bomCode?: string;
    version: string;
    items: Pick<BomItem, 'skuId' | 'productName' | 'requiredQty' | 'unit' | 'remarks'>[];
    createdBy: string;
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
}

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

async function parseResponse<T>(response: Response): Promise<T> {
    const result: ApiResponse<T> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Request failed');
    }
    return result.data;
}

// Postgres NUMERIC columns come back from `pg` as strings (same issue already fixed for
// every other table this session) - coerce right after the fetch so every consumer gets
// real numbers instead of risking string-concatenation bugs in scaled-quantity math.
function normalizeBom(bom: Bom): Bom {
    // Any "cf_*" key the backend's flat SELECT * included - pulled out into their own object
    // (see the Bom interface's customFields comment) rather than left scattered as top-level
    // properties nothing here declares a type for.
    const customFields: Record<string, unknown> = {};
    const raw = bom as unknown as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
        if (key.startsWith('cf_')) customFields[key] = raw[key];
    }
    return {
        ...bom,
        items: bom.items.map((item) => ({
            ...item,
            requiredQty: Number(item.requiredQty),
        })),
        customFields,
    };
}

export async function getBoms(): Promise<Bom[]> {
    const response = await authFetch(`${API_BASE_URL}/boms`);
    const data = await parseResponse<Bom[]>(response);
    return data.map(normalizeBom);
}

export async function getNextBomCode(): Promise<string> {
    const response = await authFetch(`${API_BASE_URL}/boms/next-code`);
    const data = await parseResponse<{ bomCode: string }>(response);
    return data.bomCode;
}

export async function createBom(payload: BomPayload): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeBom(await parseResponse<Bom>(response));
}

export async function updateBom(id: number, payload: Partial<BomPayload>): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeBom(await parseResponse<Bom>(response));
}

export async function deleteBom(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/boms/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

// Completes ONE line of a BOM (identified by its skuId, unique within a single BOM's items -
// the Add Item flow always merges a duplicate skuId into the existing row): deducts that
// Inventory item's own Raw SKU assembly from stock and credits requiredQty onto that
// same Inventory item's own quantity (see bom.controller.js's completeBomItem).
export async function completeBomItem(bomId: number, skuId: string): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms/${bomId}/items/${encodeURIComponent(skuId)}/complete`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}

// Reverses completeBomItem for one line - restores its Raw SKU assembly quantities and
// removes requiredQty back off that Inventory item's own quantity.
export async function revertBomItem(bomId: number, skuId: string): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms/${bomId}/items/${encodeURIComponent(skuId)}/revert`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}
