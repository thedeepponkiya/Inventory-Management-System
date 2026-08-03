const API_BASE_URL = 'http://localhost:5000/api/v1';

export interface MaterialInwardItem {
    skuId: string;
    skuCode: string;
    itemName: string;
    unit: string;
    orderedQty: number;
    previousReceivedQty: number;
    receivedQty: number;
    pendingQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    lineTotal: number;
    batchNo: string;
    expiryDate: string | null;
    remarks: string;
}

export interface MaterialInward {
    id: number;
    inwardNo: string;
    purchaseOrderId: number | null;
    purchaseOrderNo: string | null;
    vendorId: number;
    vendorName: string;
    receivedDate: string;
    invoiceNo: string | null;
    invoiceDate: string | null;
    challanNo: string | null;
    vehicleNo: string | null;
    warehouseId: number;
    items: MaterialInwardItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    remarks: string | null;
    receivedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface MaterialInwardPayload {
    purchaseOrderId: number | null;
    purchaseOrderNo: string | null;
    vendorId: number;
    vendorName: string;
    receivedDate: string;
    invoiceNo: string | null;
    invoiceDate: string | null;
    challanNo: string | null;
    vehicleNo: string | null;
    warehouseId: number;
    items: MaterialInwardItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    remarks: string | null;
    receivedBy: string;
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

// Postgres NUMERIC columns come back from `pg` as strings (same issue already fixed
// once for purchaseOrderService.ts) - coerce right after the fetch so every consumer
// gets real numbers instead of risking string-concatenation bugs in totals math.
function normalizeMaterialInward(mi: MaterialInward): MaterialInward {
    return {
        ...mi,
        totalQty: Number(mi.totalQty),
        subTotal: Number(mi.subTotal),
        discountAmount: Number(mi.discountAmount),
        gstAmount: Number(mi.gstAmount),
        freightCharge: Number(mi.freightCharge),
        otherCharges: Number(mi.otherCharges),
        grandTotal: Number(mi.grandTotal),
    };
}

export async function getMaterialInwards(): Promise<MaterialInward[]> {
    const response = await fetch(`${API_BASE_URL}/material-inwards`);
    const data = await parseResponse<MaterialInward[]>(response);
    return data.map(normalizeMaterialInward);
}

export async function createMaterialInward(payload: MaterialInwardPayload): Promise<MaterialInward> {
    const response = await fetch(`${API_BASE_URL}/material-inwards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeMaterialInward(await parseResponse<MaterialInward>(response));
}

export async function updateMaterialInward(id: number, payload: Partial<MaterialInwardPayload>): Promise<MaterialInward> {
    const response = await fetch(`${API_BASE_URL}/material-inwards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeMaterialInward(await parseResponse<MaterialInward>(response));
}

export async function deleteMaterialInward(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/material-inwards/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
