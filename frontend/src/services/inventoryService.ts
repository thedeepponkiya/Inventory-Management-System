const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface AssemblyLine {
    skuCode: string;
    skuName: string;
    quantity: number;
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
    createdDate: string;
    assembly: AssemblyLine[];
}

export interface InventoryPayload {
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
    assembly: AssemblyLine[];
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
        assembly: item.assembly.map((line) => ({ ...line, quantity: Number(line.quantity) })),
    };
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/inventories`);
    const data = await parseResponse<InventoryItem[]>(response);
    return data.map(normalizeInventoryItem);
}

export async function getNextSkuId(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/inventories/next-sku-id`);
    const data = await parseResponse<{ skuId: string }>(response);
    return data.skuId;
}

export async function createInventoryItem(payload: InventoryPayload): Promise<InventoryItem> {
    const response = await fetch(`${API_BASE_URL}/inventories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInventoryItem(await parseResponse<InventoryItem>(response));
}

export async function updateInventoryItem(id: number, payload: Partial<InventoryPayload>): Promise<InventoryItem> {
    const response = await fetch(`${API_BASE_URL}/inventories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInventoryItem(await parseResponse<InventoryItem>(response));
}

export async function deleteInventoryItem(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/inventories/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
