import { authFetch } from './httpClient';
import { API_BASE_URL } from './apiConfig';
import { extractCustomFields } from './customFieldService';

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

// One row per Transaction History entry (see salesOrderPayment.controller.js) - the SO's own
// paidAmount is always the sum of these, never typed in directly. paymentTerms/approvedBy/
// approvedAt are per-transaction, independent of the SO's own same-named fields.
export interface SalesOrderPayment {
    id: number;
    soId: number;
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

// One line within a single dispatch event - only the SKU/quantity actually shipped in that
// call, not the SO's full item list (see SalesOrderDispatch below).
export interface SalesOrderDispatchLineItem {
    skuId: string;
    skuCode: string;
    itemName: string;
    unit: string;
    shipQty: number;
}

// One row per Dispatch History entry (see salesOrder.controller.js's dispatchSalesOrder) -
// read-only/append-only, unlike SalesOrderPayment there's no add/delete endpoint for this from
// the frontend; a row is created automatically as a side effect of every dispatch call.
export interface SalesOrderDispatch {
    id: number;
    soId: number;
    dispatchDate: string;
    items: SalesOrderDispatchLineItem[];
    dispatchedBy: string | null;
    // Manually typed in by whoever dispatches the order (e.g. the physical delivery
    // challan/bill number) - required at the application layer (dispatchSalesOrder rejects a
    // dispatch without one), not unique. Nullable in the type only because dispatch rows
    // created before this field existed have none.
    billNo: string | null;
    createdAt: string;
}

export interface SalesOrderPaymentPayload {
    amount: number;
    paymentDate: string;
    paymentMethod: string | null;
    remarks: string | null;
    recordedBy?: string;
    paymentTerms: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
}

export interface SalesOrder {
    id: number;
    soNo: string;
    customerName: string;
    customerGstNo: string | null;
    orderDate: string;
    deliveryDate: string | null;
    deliveryAddress: string | null;
    status: SalesOrderStatus;
    paymentStatus: SalesOrderPaymentStatus;
    paidAmount: number;
    purchaseOrderRef: string | null;
    items: SalesOrderItem[];
    payments: SalesOrderPayment[];
    dispatches: SalesOrderDispatch[];
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
    // Populated from whatever "cf_*" columns exist on ims_sales_order right now - see
    // bomService.ts's identical Bom.customFields comment for the full explanation.
    customFields: Record<string, unknown>;
}

export interface SalesOrderPayload {
    // Only meaningful on create - a user-typed SO No. (the field is editable at create time,
    // left blank to auto-generate). Ignored by the update endpoint, which never lets soNo
    // change after creation.
    soNo?: string;
    customerName: string;
    customerGstNo: string | null;
    orderDate: string;
    deliveryDate: string | null;
    deliveryAddress: string | null;
    paymentStatus: SalesOrderPaymentStatus;
    paidAmount: number;
    purchaseOrderRef: string | null;
    items: SalesOrderItem[];
    totalItems: number;
    totalQty: number;
    subTotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
    remarks: string | null;
    createdBy: string;
    // Keyed by columnName (e.g. "cf_warrantyPeriod") - see CustomFieldsSection.tsx.
    customFields?: Record<string, unknown>;
}

export interface DispatchShipment {
    skuId: string;
    shipQty: number;
}

interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
    // Set when the dispatch itself succeeded but a best-effort side effect (the
    // auto-generated Sales Invoice) failed - see salesOrder.controller.js's
    // dispatchSalesOrder. Also set by revertDispatch when one of this order's
    // auto-generated invoices already had a payment recorded and couldn't be
    // auto-deleted. Absent/null on every other endpoint.
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
        payments: (so.payments ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) })),
        dispatches: (so.dispatches ?? []).map((dispatch) => ({
            ...dispatch,
            items: dispatch.items.map((item) => ({ ...item, shipQty: Number(item.shipQty) })),
        })),
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
        customFields: extractCustomFields(so as unknown as Record<string, unknown>),
    };
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders`);
    const data = await parseResponse<SalesOrder[]>(response);
    return data.map(normalizeSalesOrder);
}

export async function getNextSoNo(): Promise<string> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/next-so-no`);
    const data = await parseResponse<{ soNo: string }>(response);
    return data.soNo;
}

export async function createSalesOrder(payload: SalesOrderPayload): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function updateSalesOrder(id: number, payload: Partial<SalesOrderPayload>): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function confirmSalesOrder(id: number): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}/confirm`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

// billNo is manually typed in by whoever dispatches the order (e.g. the physical delivery
// challan/bill number) - required (the Dispatch dialog blocks Save without one), recorded
// against this specific dispatch event (see SalesOrderDispatch.billNo).
export async function dispatchSalesOrder(id: number, items: DispatchShipment[], billNo: string): Promise<{ data: SalesOrder; warning: string | null }> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, billNo }),
    });
    const result = await parseResponseWithWarning<SalesOrder>(response);
    return { data: normalizeSalesOrder(result.data), warning: result.warning };
}

export async function revertDispatchSalesOrder(id: number): Promise<{ data: SalesOrder; warning: string | null }> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}/revert-dispatch`, { method: 'POST' });
    const result = await parseResponseWithWarning<SalesOrder>(response);
    return { data: normalizeSalesOrder(result.data), warning: result.warning };
}

export async function cancelSalesOrder(id: number): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}/cancel`, { method: 'POST' });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function deleteSalesOrder(id: number): Promise<void> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${id}`, { method: 'DELETE' });
    await parseResponse<null>(response);
}

// Both return the whole updated SalesOrder (with its paidAmount/paymentStatus/payments
// already recomputed server-side) - mirrors purchaseOrderService.ts's identical pair.
export async function addSalesOrderPayment(soId: number, payload: SalesOrderPaymentPayload): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${soId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}

export async function deleteSalesOrderPayment(soId: number, paymentId: number): Promise<SalesOrder> {
    const response = await authFetch(`${API_BASE_URL}/sales-orders/${soId}/payments/${paymentId}`, {
        method: 'DELETE',
    });
    return normalizeSalesOrder(await parseResponse<SalesOrder>(response));
}
