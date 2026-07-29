export type TransactionType = 'Material Inward' | 'Issue Kit' | 'Transfer' | 'Return';

export interface Transaction {
    id: string;
    dateTime: string;
    type: TransactionType;
    referenceNo: string;
    itemType: 'SKU' | 'Kit';
    itemName: string;
    locationName: string;
    quantity: number;
    direction: 'in' | 'out';
    unit: string;
    createdBy: string;
    remarks: string;
}

export const transactionMockData: Transaction[] = [
    { id: 'TX-01', dateTime: '21 May 2025, 10:15 AM', type: 'Material Inward', referenceNo: 'MI-2025-00045', itemType: 'SKU', itemName: 'Handle (SKU-001)', locationName: 'Main Warehouse - A1', quantity: 50, direction: 'in', unit: 'PCS', createdBy: 'Admin User', remarks: 'Supplier: ABC Tools' },
    { id: 'TX-02', dateTime: '21 May 2025, 09:40 AM', type: 'Issue Kit', referenceNo: 'IK-2025-00028', itemType: 'Kit', itemName: 'Mortise Handle Kit (KIT-001)', locationName: 'Main Warehouse - A1', quantity: 10, direction: 'out', unit: 'PCS', createdBy: 'Admin User', remarks: 'Issued to: Production' },
    { id: 'TX-03', dateTime: '20 May 2025, 04:30 PM', type: 'Material Inward', referenceNo: 'MI-2025-00044', itemType: 'SKU', itemName: 'Plate (SKU-002)', locationName: 'Main Warehouse - A1', quantity: 100, direction: 'in', unit: 'PCS', createdBy: 'Admin User', remarks: 'Supplier: XYZ Pvt. Ltd.' },
    { id: 'TX-04', dateTime: '20 May 2025, 02:10 PM', type: 'Transfer', referenceNo: 'TR-2025-00015', itemType: 'SKU', itemName: 'Spring (SKU-003)', locationName: 'A1 -> B2', quantity: 200, direction: 'out', unit: 'PCS', createdBy: 'Admin User', remarks: 'Transfer to B2' },
    { id: 'TX-05', dateTime: '19 May 2025, 03:25 PM', type: 'Issue Kit', referenceNo: 'IK-2025-00027', itemType: 'Kit', itemName: 'Door Lock Kit (KIT-002)', locationName: 'Main Warehouse - A1', quantity: 5, direction: 'out', unit: 'PCS', createdBy: 'Admin User', remarks: 'Issued to: Assembly' },
    { id: 'TX-06', dateTime: '19 May 2025, 11:05 AM', type: 'Return', referenceNo: 'RT-2025-00008', itemType: 'SKU', itemName: 'Bush (SKU-004)', locationName: 'Main Warehouse - A1', quantity: 20, direction: 'in', unit: 'PCS', createdBy: 'Admin User', remarks: 'Return from Production' },
    { id: 'TX-07', dateTime: '18 May 2025, 05:15 PM', type: 'Material Inward', referenceNo: 'MI-2025-00043', itemType: 'SKU', itemName: 'Screw (SKU-005)', locationName: 'Main Warehouse - B2', quantity: 500, direction: 'in', unit: 'PCS', createdBy: 'Admin User', remarks: 'Supplier: ABC Tools' },
    { id: 'TX-08', dateTime: '18 May 2025, 01:20 PM', type: 'Transfer', referenceNo: 'TR-2025-00014', itemType: 'Kit', itemName: 'Cylinder Lock Kit (KIT-003)', locationName: 'A1 -> F1', quantity: 15, direction: 'out', unit: 'PCS', createdBy: 'Admin User', remarks: 'Transfer to Finished Goods' },
    { id: 'TX-09', dateTime: '17 May 2025, 04:45 PM', type: 'Issue Kit', referenceNo: 'IK-2025-00026', itemType: 'Kit', itemName: 'Hinges Kit (KIT-005)', locationName: 'Main Warehouse - A1', quantity: 8, direction: 'out', unit: 'PCS', createdBy: 'Admin User', remarks: 'Issued to: Maintenance' },
    { id: 'TX-10', dateTime: '17 May 2025, 10:30 AM', type: 'Return', referenceNo: 'RT-2025-00007', itemType: 'SKU', itemName: 'Pin (SKU-006)', locationName: 'Main Warehouse - A1', quantity: 30, direction: 'in', unit: 'PCS', createdBy: 'Admin User', remarks: 'Return from QA' },
];
