const API_BASE_URL = 'http://localhost:5000/api/v1';

export type InvoiceType = 'Purchase' | 'Sales';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface Invoice {
    id: number;
    invoiceNo: string;
    invoiceDate: string;
    invoiceType: InvoiceType;
    referenceNo: string | null;
    materialInwardNo: string | null;
    customerSupplier: string | null;
    location: string | null;
    totalQty: number;
    subTotal: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    dueDate: string | null;
    paymentTerms: string | null;
    paymentStatus: PaymentStatus;
    remarks: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InvoicePayload {
    invoiceDate: string;
    invoiceType: InvoiceType;
    referenceNo: string | null;
    materialInwardNo: string | null;
    customerSupplier: string | null;
    location: string | null;
    totalQty: number;
    subTotal: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    gstPercent: number;
    gstAmount: number;
    freightCharge: number;
    otherCharges: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
    dueDate: string | null;
    paymentTerms: string | null;
    paymentStatus: PaymentStatus;
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

// Postgres NUMERIC columns come back from `pg` as strings (same issue already fixed for
// purchaseOrderService.ts/materialInwardService.ts) - coerce right after the fetch so every
// consumer gets real numbers instead of risking string-concatenation bugs in totals math.
function normalizeInvoice(invoice: Invoice): Invoice {
    return {
        ...invoice,
        totalQty: Number(invoice.totalQty),
        subTotal: Number(invoice.subTotal),
        unitPrice: Number(invoice.unitPrice),
        discountPercent: Number(invoice.discountPercent),
        discountAmount: Number(invoice.discountAmount),
        gstPercent: Number(invoice.gstPercent),
        gstAmount: Number(invoice.gstAmount),
        freightCharge: Number(invoice.freightCharge),
        otherCharges: Number(invoice.otherCharges),
        grandTotal: Number(invoice.grandTotal),
        paidAmount: Number(invoice.paidAmount),
        dueAmount: Number(invoice.dueAmount),
    };
}

export async function getInvoices(): Promise<Invoice[]> {
    const response = await fetch(`${API_BASE_URL}/invoices`);
    const data = await parseResponse<Invoice[]>(response);
    return data.map(normalizeInvoice);
}

export async function createInvoice(payload: InvoicePayload): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInvoice(await parseResponse<Invoice>(response));
}

export async function updateInvoice(id: number, payload: Partial<InvoicePayload>): Promise<Invoice> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeInvoice(await parseResponse<Invoice>(response));
}

export async function deleteInvoice(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'DELETE',
    });
    await parseResponse<null>(response);
}
