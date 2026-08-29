import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';
import { extractCustomFields } from './customFieldService';

export interface AssemblyLine {
    skuCode: string;
    skuName: string;
    quantity: number;
    unit: string;
}

export interface InventoryItem {
    id: number;
    images: string[];
    skuId: string;
    productName: string;
    categoryName: string | null;
    productType: string | null;
    barcode: string | null;
    quantity: number;
    unit: string;
    locationName: string | null;
    status: 'Active' | 'Inactive';
    unitCost: number;
    sellingCost: number;
    createdDate: string;
    assembly: AssemblyLine[];
    minStock: number;
    maxStock: number;
    openingStock: number;
    // Populated from whatever "cf_*" columns exist on ims_inventories right now - see
    // bomService.ts's identical Bom.customFields comment for the full explanation.
    customFields: Record<string, unknown>;
}

export interface InventoryPayload {
    // Editable both at create time (pre-filled with a server-generated suggestion the user
    // can overwrite) and on update (the field is unlocked in the Edit dialog too) - the
    // backend re-checks uniqueness against other rows either way.
    skuId?: string;
    images: string[];
    productName: string;
    categoryName: string | null;
    productType: string | null;
    barcode: string | null;
    quantity: number;
    unit: string;
    locationName: string | null;
    status: 'Active' | 'Inactive';
    unitCost: number;
    sellingCost: number;
    assembly: AssemblyLine[];
    minStock: number;
    maxStock: number;
    openingStock: number;
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
// real numbers instead of risking string-concatenation bugs in stock math.
function normalizeInventoryItem(item: InventoryItem): InventoryItem {
    return {
        ...item,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        sellingCost: Number(item.sellingCost),
        minStock: Number(item.minStock),
        maxStock: Number(item.maxStock),
        openingStock: Number(item.openingStock),
        assembly: item.assembly.map((line) => ({ ...line, quantity: Number(line.quantity) })),
        customFields: extractCustomFields(item as unknown as Record<string, unknown>),
    };
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
    const response = await authFetch(`${API_BASE_URL}/inventories`);
    const data = await parseResponse<InventoryItem[]>(response);
    return data.map(normalizeInventoryItem);
}

export async function getNextSkuId(): Promise<string> {
    const response = await authFetch(`${API_BASE_URL}/inventories/next-sku-id`);
    const data = await parseResponse<{ skuId: string }>(response);
    return data.skuId;
}

export async function createInventoryItem(payload: InventoryPayload): Promise<InventoryItem> {
    const response = await authFetch(`${API_BASE_URL}/inventories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInventoryItem(await parseResponse<InventoryItem>(response));
}

export async function updateInventoryItem(id: number, payload: Partial<InventoryPayload>): Promise<InventoryItem> {
    const response = await authFetch(`${API_BASE_URL}/inventories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInventoryItem(await parseResponse<InventoryItem>(response));
}

export async function deleteInventoryItem(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/inventories/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

// Uploads a product image file to the backend (saved under backend/uploads/products) and
// returns just its relative path (e.g. /uploads/products/xxx.jpg) - that's what gets stored
// in InventoryItem.images, never the file's binary content or a client-side blob: URL (which
// wouldn't survive a page reload). Rendering it back requires resolveImageUrl (commonFunction.ts)
// to turn the relative path into a full URL.
export async function uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await authFetch(`${API_BASE_URL}/uploads/product-image`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseResponse<{ path: string }>(response);
    return data.path;
}
