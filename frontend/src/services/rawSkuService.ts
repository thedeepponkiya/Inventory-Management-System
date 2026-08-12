import { authFetch } from './httpClient';
const API_BASE_URL = 'http://localhost:5000/api/v1';

export type InventoryEntryMode = 'AUTO' | 'MANUAL';
export type SourceType = 'Direct Purchase' | 'Processed';

export interface RawSku {
    id: number;
    images: string[];
    skuCode: string;
    skuName: string;
    categoryId: number | null;
    categoryName: string | null;
    productTypeId: number | null;
    productTypeName: string | null;
    locationId: number | null;
    locationName: string | null;
    unit: string;
    inventoryEntryMode: InventoryEntryMode;
    sourceType: SourceType;
    rawMaterialId: number | null;
    rawMaterialName: string | null;
    minStock: number;
    maxStock: number;
    reorderLevel: number;
    openingStock: number;
    currentStock: number;
    description: string | null;
    status: 'Active' | 'Inactive';
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface RawSkuPayload {
    images: string[];
    skuName: string;
    categoryId: number | null;
    productTypeId: number | null;
    locationId: number | null;
    unit: string;
    inventoryEntryMode: InventoryEntryMode;
    sourceType: SourceType;
    rawMaterialId: number | null;
    minStock: number;
    maxStock: number;
    reorderLevel: number;
    openingStock: number;
    currentStock: number;
    description: string | null;
    status: 'Active' | 'Inactive';
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
// real numbers instead of risking string-concatenation bugs in stock math.
function normalizeRawSku(rawSku: RawSku): RawSku {
    return {
        ...rawSku,
        minStock: Number(rawSku.minStock),
        maxStock: Number(rawSku.maxStock),
        reorderLevel: Number(rawSku.reorderLevel),
        openingStock: Number(rawSku.openingStock),
        currentStock: Number(rawSku.currentStock),
    };
}

export async function getRawSkus(): Promise<RawSku[]> {
    const response = await authFetch(`${API_BASE_URL}/raw-skus`);
    const data = await parseResponse<RawSku[]>(response);
    return data.map(normalizeRawSku);
}

export async function getNextSkuCode(): Promise<string> {
    const response = await authFetch(`${API_BASE_URL}/raw-skus/next-code`);
    const data = await parseResponse<{ skuCode: string }>(response);
    return data.skuCode;
}

export async function createRawSku(payload: RawSkuPayload): Promise<RawSku> {
    const response = await authFetch(`${API_BASE_URL}/raw-skus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeRawSku(await parseResponse<RawSku>(response));
}

export async function updateRawSku(id: number, payload: Partial<RawSkuPayload>): Promise<RawSku> {
    const response = await authFetch(`${API_BASE_URL}/raw-skus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeRawSku(await parseResponse<RawSku>(response));
}

export async function deleteRawSku(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/raw-skus/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
