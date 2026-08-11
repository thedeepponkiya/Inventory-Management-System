import { authFetch } from './httpClient';
const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface BomItem {
    rawSkuCode: string;
    rawSkuName: string;
    requiredQty: number;
    unit: string;
    remarks: string;
}

export interface Bom {
    id: number;
    bomCode: string;
    productSku: string;
    productName: string;
    categoryName: string | null;
    version: string;
    outputQty: number;
    unit: string;
    status: 'Process' | 'Completed';
    items: BomItem[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BomPayload {
    // Only meaningful on create - the code previewed in the Add Order dialog (via
    // getNextBomCode), reused as-is so the previewed code matches what actually gets saved.
    bomCode?: string;
    productSku: string;
    productName: string;
    categoryName: string | null;
    version: string;
    outputQty: number;
    unit: string;
    status: 'Process' | 'Completed';
    items: BomItem[];
    createdBy: string;
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
    return {
        ...bom,
        outputQty: Number(bom.outputQty),
        items: bom.items.map((item) => ({
            ...item,
            requiredQty: Number(item.requiredQty),
        })),
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

// Moves a BOM from Process to Completed: deducts each component's scaled quantity from the
// matching Raw SKU's currentStock and adds outputQty onto the matching finished-good's
// Inventory quantity (see bom.controller.js's completeBom).
export async function completeBom(id: number): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms/${id}/complete`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}

// Reverses completeBom: moves Completed back to Process, restores the deducted raw
// material, and removes the added Inventory quantity.
export async function revertBomToProcess(id: number): Promise<Bom> {
    const response = await authFetch(`${API_BASE_URL}/boms/${id}/revert`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}
