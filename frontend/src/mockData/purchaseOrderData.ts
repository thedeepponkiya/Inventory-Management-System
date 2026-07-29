export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Approved' | 'Received' | 'Cancelled';

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    date: string;
    supplierName: string;
    locationName: string;
    totalAmount: number;
    status: PurchaseOrderStatus;
    createdBy: string;
}

export const purchaseOrderMockData: PurchaseOrder[] = [
    { id: 'PO-1', poNumber: 'PO-2025-000112', date: '21 May 2025', supplierName: 'ABC Tools', locationName: 'Main Warehouse - A1', totalAmount: 145000, status: 'Approved', createdBy: 'Admin User' },
    { id: 'PO-2', poNumber: 'PO-2025-000111', date: '20 May 2025', supplierName: 'XYZ Pvt. Ltd.', locationName: 'Main Warehouse - A2', totalAmount: 98600, status: 'Sent', createdBy: 'Admin User' },
    { id: 'PO-3', poNumber: 'PO-2025-000110', date: '19 May 2025', supplierName: 'Shree Enterprises', locationName: 'Main Warehouse - B1', totalAmount: 212500, status: 'Received', createdBy: 'Priya Sharma' },
    { id: 'PO-4', poNumber: 'PO-2025-000109', date: '18 May 2025', supplierName: 'Global Industries', locationName: 'Main Warehouse - B2', totalAmount: 67800, status: 'Draft', createdBy: 'Admin User' },
    { id: 'PO-5', poNumber: 'PO-2025-000108', date: '17 May 2025', supplierName: 'Precision Engineering', locationName: 'Raw Material Area', totalAmount: 305000, status: 'Approved', createdBy: 'Ravi Kumar' },
    { id: 'PO-6', poNumber: 'PO-2025-000107', date: '16 May 2025', supplierName: 'ABC Tools', locationName: 'Spare Parts Section', totalAmount: 42500, status: 'Received', createdBy: 'Admin User' },
    { id: 'PO-7', poNumber: 'PO-2025-000106', date: '15 May 2025', supplierName: 'XYZ Pvt. Ltd.', locationName: 'Main Warehouse - A1', totalAmount: 88000, status: 'Cancelled', createdBy: 'Admin User' },
    { id: 'PO-8', poNumber: 'PO-2025-000105', date: '14 May 2025', supplierName: 'Shree Enterprises', locationName: 'Main Warehouse - B1', totalAmount: 156200, status: 'Sent', createdBy: 'Priya Sharma' },
];
