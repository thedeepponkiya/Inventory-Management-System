const API_BASE_URL = 'http://localhost:5000/api/v1';

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
    sellingCost: number;
    assembly: AssemblyLine[];
    minStock: number;
    maxStock: number;
    openingStock: number;
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

// Uploads a product image file to the backend (saved under backend/uploads/products) and
// returns just its relative path (e.g. /uploads/products/xxx.jpg) - that's what gets stored
// in InventoryItem.images, never the file's binary content or a client-side blob: URL (which
// wouldn't survive a page reload). Rendering it back requires resolveImageUrl (commonFunction.ts)
// to turn the relative path into a full URL.
export async function uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/uploads/product-image`, {
        method: 'POST',
        body: formData,
    });
    const data = await parseResponse<{ path: string }>(response);
    return data.path;
}
