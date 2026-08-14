import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Received' | 'Cancelled';
export type PurchaseOrderPaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

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

// One row per Transaction History entry (see purchaseOrderPayment.controller.js) - the PO's
// own paidAmount is always the sum of these, never typed in directly. paymentTerms/approvedBy/
// approvedAt live here (per-transaction) rather than on the PO itself, since a given payment
// can be approved separately under its own terms.
export interface PurchaseOrderPayment {
    id: number;
    poId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string | null;
    remarks: string | null;
    recordedBy: string | null;
    createdAt: string;
    paymentTerms: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
}

export interface PurchaseOrderPaymentPayload {
    amount: number;
    paymentDate: string;
    paymentMethod: string | null;
    remarks: string | null;
    recordedBy?: string;
    paymentTerms: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
}

export interface PurchaseOrder {
    id: number;
    poNo: string;
    vendorId: number;
    vendorName: string;
    poDate: string;
    expectedDeliveryDate: string | null;
    shippingDate: string | null;
    deliveryAddress: string | null;
    status: PurchaseOrderStatus;
    paymentStatus: PurchaseOrderPaymentStatus;
    paidAmount: number;
    items: PurchaseOrderItem[];
    payments: PurchaseOrderPayment[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
    remarks: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrderPayload {
    vendorId: number;
    poDate: string;
    expectedDeliveryDate: string | null;
    shippingDate: string | null;
    deliveryAddress: string | null;
    status: PurchaseOrderStatus;
    paymentStatus: PurchaseOrderPaymentStatus;
    paidAmount: number;
    items: PurchaseOrderItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
    remarks: string | null;
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

// Postgres NUMERIC columns come back from `pg` as strings (to avoid float
// precision loss), even though every consumer here expects real numbers.
// Coercing right after the fetch keeps that a one-time concern instead of
// something every caller has to remember.
function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
    return {
        ...po,
        totalQty: Number(po.totalQty),
        subTotal: Number(po.subTotal),
        discountAmount: Number(po.discountAmount),
        gstAmount: Number(po.gstAmount),
        grandTotal: Number(po.grandTotal),
        paidAmount: Number(po.paidAmount),
        // (po.payments ?? []) - defensive against an older cached response shape that
        // predates this field; each entry's amount gets the same NUMERIC-comes-back-as-string
        // coercion as the PO's own totals above.
        payments: (po.payments ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) })),
    };
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders`);
    const data = await parseResponse<PurchaseOrder[]>(response);
    return data.map(normalizePurchaseOrder);
}

export async function createPurchaseOrder(payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}

export async function updatePurchaseOrder(id: number, payload: Partial<PurchaseOrderPayload>): Promise<PurchaseOrder> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}

export async function deletePurchaseOrder(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}

// Both return the whole updated PurchaseOrder (with its paidAmount/paymentStatus/payments
// already recomputed server-side) rather than just the new/deleted payment row - callers
// refetch the PO list afterwards anyway (see PurchaseOrderForm.tsx), so this saves a second
// round trip to pick up the recalculated totals.
export async function addPurchaseOrderPayment(poId: number, payload: PurchaseOrderPaymentPayload): Promise<PurchaseOrder> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders/${poId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}

export async function deletePurchaseOrderPayment(poId: number, paymentId: number): Promise<PurchaseOrder> {
    const response = await authFetch(`${API_BASE_URL}/purchase-orders/${poId}/payments/${paymentId}`, {
        method: 'DELETE',
    });
    return normalizePurchaseOrder(await parseResponse<PurchaseOrder>(response));
}
