export type InvoiceType = 'Sales Invoice' | 'Sales Return' | 'Proforma Invoice';
export type InvoiceStatus = 'Paid' | 'Partial' | 'Overdue' | 'Pending' | 'Draft' | 'Canceled';

export interface Invoice {
    id: string;
    invoiceNo: string;
    date: string;
    type: InvoiceType;
    partyName: string;
    locationName: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    status: InvoiceStatus;
    createdBy: string;
}

export const invoiceMockData: Invoice[] = [
    { id: 'INV-1', invoiceNo: 'INV-2025-000245', date: '21 May 2025', type: 'Sales Invoice', partyName: 'ABC Tools Pvt. Ltd.', locationName: 'Main Warehouse - A1', totalAmount: 125000, paidAmount: 125000, dueAmount: 0, status: 'Paid', createdBy: 'Admin User' },
    { id: 'INV-2', invoiceNo: 'INV-2025-000244', date: '21 May 2025', type: 'Sales Invoice', partyName: 'XYZ Machinery', locationName: 'Main Warehouse - A1', totalAmount: 85600, paidAmount: 42800, dueAmount: 42800, status: 'Partial', createdBy: 'Admin User' },
    { id: 'INV-3', invoiceNo: 'INV-2025-000243', date: '20 May 2025', type: 'Sales Invoice', partyName: 'Precision Engineering', locationName: 'Main Warehouse - A1', totalAmount: 235000, paidAmount: 0, dueAmount: 235000, status: 'Overdue', createdBy: 'Admin User' },
    { id: 'INV-4', invoiceNo: 'INV-2025-000242', date: '20 May 2025', type: 'Sales Invoice', partyName: 'Global Industries', locationName: 'A1 -> B2', totalAmount: 110500, paidAmount: 110500, dueAmount: 0, status: 'Paid', createdBy: 'Admin User' },
    { id: 'INV-5', invoiceNo: 'INV-2025-000241', date: '19 May 2025', type: 'Sales Return', partyName: 'ABC Tools Pvt. Ltd.', locationName: 'Main Warehouse - A1', totalAmount: 25500, paidAmount: 25500, dueAmount: 0, status: 'Paid', createdBy: 'Admin User' },
    { id: 'INV-6', invoiceNo: 'INV-2025-000240', date: '19 May 2025', type: 'Sales Invoice', partyName: 'Mech Solutions', locationName: 'Main Warehouse - A1', totalAmount: 67800, paidAmount: 0, dueAmount: 67800, status: 'Pending', createdBy: 'Admin User' },
    { id: 'INV-7', invoiceNo: 'INV-2025-000239', date: '18 May 2025', type: 'Sales Invoice', partyName: 'Shree Enterprises', locationName: 'Main Warehouse - B2', totalAmount: 365000, paidAmount: 165000, dueAmount: 200000, status: 'Partial', createdBy: 'Admin User' },
    { id: 'INV-8', invoiceNo: 'INV-2025-000238', date: '18 May 2025', type: 'Proforma Invoice', partyName: 'Future Tech', locationName: 'A1 -> F1', totalAmount: 95000, paidAmount: 0, dueAmount: 95000, status: 'Draft', createdBy: 'Admin User' },
    { id: 'INV-9', invoiceNo: 'INV-2025-000237', date: '17 May 2025', type: 'Sales Invoice', partyName: 'Kiran Industries', locationName: 'Main Warehouse - A1', totalAmount: 148000, paidAmount: 148000, dueAmount: 0, status: 'Paid', createdBy: 'Admin User' },
    { id: 'INV-10', invoiceNo: 'INV-2025-000236', date: '17 May 2025', type: 'Sales Invoice', partyName: 'Ultra Engineers', locationName: 'Main Warehouse - A1', totalAmount: 76500, paidAmount: 0, dueAmount: 76500, status: 'Overdue', createdBy: 'Admin User' },
];
