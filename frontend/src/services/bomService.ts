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
    status: 'Process' | 'Dispatch';
    items: BomItem[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BomPayload {
    productSku: string;
    productName: string;
    categoryName: string | null;
    version: string;
    outputQty: number;
    unit: string;
    status: 'Process' | 'Dispatch';
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
    const response = await fetch(`${API_BASE_URL}/boms`);
    const data = await parseResponse<Bom[]>(response);
    return data.map(normalizeBom);
}

export async function getNextBomCode(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/boms/next-code`);
    const data = await parseResponse<{ bomCode: string }>(response);
    return data.bomCode;
}

export async function createBom(payload: BomPayload): Promise<Bom> {
    const response = await fetch(`${API_BASE_URL}/boms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeBom(await parseResponse<Bom>(response));
}

export async function updateBom(id: number, payload: Partial<BomPayload>): Promise<Bom> {
    const response = await fetch(`${API_BASE_URL}/boms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeBom(await parseResponse<Bom>(response));
}

export async function deleteBom(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/boms/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

// Moves a BOM from Process to Dispatch, deducting each component's scaled quantity from
// the matching Raw SKU's currentStock (see bom.controller.js's dispatchBom).
export async function dispatchBom(id: number): Promise<Bom> {
    const response = await fetch(`${API_BASE_URL}/boms/${id}/dispatch`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}

// Reverses dispatchBom: moves Dispatch back to Process and restores the deducted quantities.
export async function revertBomToProcess(id: number): Promise<Bom> {
    const response = await fetch(`${API_BASE_URL}/boms/${id}/revert`, { method: 'PUT' });
    return normalizeBom(await parseResponse<Bom>(response));
}
