const API_BASE_URL = 'http://localhost:5000/api/v1';

export type SalesOrderStatus = 'Draft' | 'Confirmed' | 'Processing' | 'Partially Shipped' | 'Dispatched' | 'Cancelled';
export type SalesOrderPaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface SalesOrderItem {
    skuId: string;
    skuCode: string;
    itemName: string;
    unit: string;
    orderedQty: number;
    dispatchedQty: number;
    pendingQty: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    lineTotal: number;
}

export interface SalesOrder {
    id: number;
    soNo: string;
    customerName: string;
    customerCode: string | null;
    orderDate: string;
    deliveryDate: string | null;
    deliveryAddress: string | null;
    status: SalesOrderStatus;
    paymentStatus: SalesOrderPaymentStatus;
    paidAmount: number;
    paymentTerms: string | null;
    purchaseOrderRef: string | null;
    currency: string;
    items: SalesOrderItem[];
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

export interface SalesOrderPayload {
    customerName: string;
    customerCode: string | null;
    orderDate: string;
    deliveryDate: string | null;
    deliveryAddress: string | null;
    paymentStatus: SalesOrderPaymentStatus;
    paidAmount: number;
    paymentTerms: string | null;
    purchaseOrderRef: string | null;
    currency: string;
    items: SalesOrderItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
    remarks: string | null;
    createdBy: string;
}

export interface DispatchShipment {
    skuId: string;
    shipQty: number;
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

// Postgres NUMERIC columns come back from `pg` as strings - coerce right after the fetch,
// same pattern as every other table in this app (see purchaseOrderService.ts).
function normalizeSalesOrder(so: SalesOrder): SalesOrder {
    return {
        ...so,
        totalQty: Number(so.totalQty),
        subTotal: Number(so.subTotal),
        discountAmount: Number(so.discountAmount),
        gstAmount: Number(so.gstAmount),
        grandTotal: Number(so.grandTotal),
        paidAmount: Number(so.paidAmount),
        items: so.items.map((item) => ({
            ...item,
            orderedQty: Number(item.orderedQty),
            dispatchedQty: Number(item.dispatchedQty),
            pendingQty: Number(item.pendingQty),
            unitPrice: Number(item.unitPrice),
            discountPercent: Number(item.discountPercent),
            discountAmount: Number(item.discountAmount),
            gstPercent: Number(item.gstPercent),
            gstAmount: Number(item.gstAmount),
            lineTotal: Number(item.lineTotal),
        })),
    };
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
    const response = await fetch(`${API_BASE_URL}/sales-orders`);
    const data = await parseResponse<SalesOrder[]>(response);
    return data.map(normalizeSalesOrder);
}

export async function createSalesOrder(payload: SalesOrderPayload): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function updateSalesOrder(id: number, payload: Partial<SalesOrderPayload>): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function confirmSalesOrder(id: number): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}/confirm`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function startProcessingSalesOrder(id: number): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}/start-processing`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function dispatchSalesOrder(id: number, items: DispatchShipment[]): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function revertDispatchSalesOrder(id: number): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}/revert-dispatch`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function cancelSalesOrder(id: number): Promise<SalesOrder> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}/cancel`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function deleteSalesOrder(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sales-orders/${id}`, { method: 'DELETE' });
    await parseResponse<null>(response);
}
