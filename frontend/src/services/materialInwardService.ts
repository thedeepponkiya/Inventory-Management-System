import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';
import { extractCustomFields } from './customFieldService';

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
    // Populated from whatever "cf_*" columns exist on ims_material_inward right now - see
    // bomService.ts's identical Bom.customFields comment for the full explanation.
    customFields: Record<string, unknown>;
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
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
}

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
    // Set when the primary save succeeded but a best-effort side effect (e.g. the
    // auto-generated Purchase Invoice) failed - see materialInward.controller.js's
    // createMaterialInward. Absent/null on every other endpoint.
    warning?: string | null;
}

async function parseResponse<T>(response: Response): Promise<T> {
    const result: ApiResponse<T> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Request failed');
    }
    return result.data;
}

async function parseResponseWithWarning<T>(response: Response): Promise<{ data: T; warning: string | null }> {
    const result: ApiResponse<T> = await response.json();
    if (!response.ok || !result.status) {
        throw new Error(result.message ?? 'Request failed');
    }
    return { data: result.data, warning: result.warning ?? null };
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
        customFields: extractCustomFields(mi as unknown as Record<string, unknown>),
    };
}

export async function getMaterialInwards(): Promise<MaterialInward[]> {
    const response = await authFetch(`${API_BASE_URL}/material-inwards`);
    const data = await parseResponse<MaterialInward[]>(response);
    return data.map(normalizeMaterialInward);
}

export async function createMaterialInward(payload: MaterialInwardPayload): Promise<{ data: MaterialInward; warning: string | null }> {
    const response = await authFetch(`${API_BASE_URL}/material-inwards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await parseResponseWithWarning<MaterialInward>(response);
    return { data: normalizeMaterialInward(result.data), warning: result.warning };
}

// Returns `warning` alongside the record for the same reason create does: an edit re-applies
// the items' Raw SKU stock, so it can hit the same "this item's skuCode matches no Raw SKU"
// soft failure and the caller needs to be able to surface it.
export async function updateMaterialInward(id: number, payload: Partial<MaterialInwardPayload>): Promise<{ data: MaterialInward; warning: string | null }> {
    const response = await authFetch(`${API_BASE_URL}/material-inwards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result = await parseResponseWithWarning<MaterialInward>(response);
    return { data: normalizeMaterialInward(result.data), warning: result.warning };
}

export async function deleteMaterialInward(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/material-inwards/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
