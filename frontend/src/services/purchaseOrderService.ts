const API_BASE_URL = 'http://localhost:5000/api/v1';

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Approved' | 'Received' | 'Cancelled';

export interface PurchaseOrderItem {
    skuId: string;
    skuCode: string;
    itemName: string;
    category: string;
    unit: string;
    orderedQty: number;
    receivedQty: number;
    pendingQty: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    lineTotal: number;
    remarks: string;
}

export interface PurchaseOrder {
    id: number;
    poNo: string;
    vendorId: number;
    vendorName: string;
    poDate: string;
    expectedDeliveryDate: string | null;
    deliveryAddress: string | null;
    paymentTerms: string | null;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrderPayload {
    vendorId: number;
    poDate: string;
    expectedDeliveryDate: string | null;
    deliveryAddress: string | null;
    paymentTerms: string | null;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    remarks: string | null;
    createdBy: string;
    approvedBy: string | null;
    approvedAt: string | null;
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

// Postgres NUMERIC columns come back from `pg` as strings (to avoid float
// precision loss), even though every consumer here expects real numbers.
// Coercing right after the fetch keeps that a one-time concern instead of
// something every caller has to remember (the bug this fixed: string
// freightCharge/otherCharges got silently string-concatenated into grandTotal).
function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
    return {
        ...po,
        totalQty: Number(po.totalQty),
        subTotal: Number(po.subTotal),
        discountAmount: Number(po.discountAmount),
        gstAmount: Number(po.gstAmount),
        freightCharge: Number(po.freightCharge),
        otherCharges: Number(po.otherCharges),
        grandTotal: Number(po.grandTotal),
    };
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders`);
    const data = await parseResponse<PurchaseOrder[]>(response);
    return data.map(normalizePurchaseOrder);
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}

export async function updatePurchaseOrder(id: number, payload: Partial<PurchaseOrderPayload>): Promise<PurchaseOrder> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}

export async function deletePurchaseOrder(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
