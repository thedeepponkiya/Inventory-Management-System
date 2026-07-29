export interface AssemblyLine {
    skuCode: string;
    skuName: string;
    quantity: number;
}

export interface InventoryItem {
    id: string;
    images: string[];
    skuId: string;
    productName: string;
    categoryName: string;
    productType: string;
    barcode: string;
    quantity: number;
    unit: string;
    locationName: string;
    status: 'Active' | 'Inactive';
    unitCost: number;
    createdDate: string;
    assembly: AssemblyLine[];
}

export const inventoryHomeMockData: InventoryItem[] = [
    { id: 'SKU-001', images: [], skuId: 'SKU-001', productName: 'Handle', categoryName: 'Handle Box', productType: 'Component', barcode: '8901234500011', quantity: 1250, unit: 'PCS', locationName: 'Main Warehouse - A1', status: 'Active', unitCost: 120, createdDate: '02 Jan 2025', assembly: [] },
    { id: 'SKU-002', images: [], skuId: 'SKU-002', productName: 'Plate', categoryName: 'Plate Box', productType: 'Component', barcode: '8901234500028', quantity: 980, unit: 'PCS', locationName: 'Main Warehouse - A1', status: 'Active', unitCost: 100, createdDate: '02 Jan 2025', assembly: [] },
    { id: 'SKU-003', images: [], skuId: 'SKU-003', productName: 'Spring', categoryName: 'Spring Box', productType: 'Component', barcode: '8901234500035', quantity: 1100, unit: 'PCS', locationName: 'Main Warehouse - B1', status: 'Active', unitCost: 80, createdDate: '05 Jan 2025', assembly: [] },
    { id: 'SKU-004', images: [], skuId: 'SKU-004', productName: 'Bush', categoryName: 'Bush Box', productType: 'Component', barcode: '8901234500042', quantity: 640, unit: 'PCS', locationName: 'Main Warehouse - B1', status: 'Active', unitCost: 70, createdDate: '05 Jan 2025', assembly: [] },
    { id: 'SKU-005', images: [], skuId: 'SKU-005', productName: 'Screw', categoryName: 'Screw Box', productType: 'Consumable', barcode: '8901234500059', quantity: 4800, unit: 'PCS', locationName: 'Main Warehouse - A2', status: 'Active', unitCost: 30, createdDate: '10 Jan 2025', assembly: [] },
    { id: 'SKU-006', images: [], skuId: 'SKU-006', productName: 'Pin', categoryName: 'Pin Box', productType: 'Component', barcode: '8901234500066', quantity: 1260, unit: 'PCS', locationName: 'Main Warehouse - A2', status: 'Active', unitCost: 20, createdDate: '10 Jan 2025', assembly: [] },
    { id: 'SKU-007', images: [], skuId: 'SKU-007', productName: 'Washer', categoryName: 'Screw Box', productType: 'Consumable', barcode: '8901234500073', quantity: 2300, unit: 'PCS', locationName: 'Main Warehouse - A2', status: 'Active', unitCost: 15, createdDate: '10 Jan 2025', assembly: [] },
    { id: 'SKU-008', images: [], skuId: 'SKU-008', productName: 'Nut', categoryName: 'Screw Box', productType: 'Consumable', barcode: '8901234500080', quantity: 2150, unit: 'PCS', locationName: 'Main Warehouse - A2', status: 'Active', unitCost: 10, createdDate: '10 Jan 2025', assembly: [] },
    {
        id: 'SKU-009', images: [], skuId: 'SKU-009', productName: 'Lock Body', categoryName: 'Lock Box', productType: 'Finished Good', barcode: '8901234500097', quantity: 320, unit: 'PCS', locationName: 'Finished Goods Area', status: 'Active', unitCost: 250, createdDate: '15 Jan 2025',
        assembly: [
            { skuCode: 'SKU-013', skuName: 'Cylinder Barrel', quantity: 1 },
            { skuCode: 'SKU-003', skuName: 'Spring', quantity: 2 },
            { skuCode: 'SKU-006', skuName: 'Pin', quantity: 4 },
        ],
    },
    {
        id: 'SKU-010', images: [], skuId: 'SKU-010', productName: 'Key', categoryName: 'Lock Box', productType: 'Finished Good', barcode: '8901234500103', quantity: 510, unit: 'PCS', locationName: 'Finished Goods Area', status: 'Active', unitCost: 150, createdDate: '15 Jan 2025',
        assembly: [
            { skuCode: 'SKU-013', skuName: 'Cylinder Barrel', quantity: 1 },
        ],
    },
    { id: 'SKU-011', images: [], skuId: 'SKU-011', productName: 'Allen Key', categoryName: 'Tools Box', productType: 'Tool', barcode: '8901234500110', quantity: 400, unit: 'PCS', locationName: 'Spare Parts Section', status: 'Active', unitCost: 25, createdDate: '18 Jan 2025', assembly: [] },
    { id: 'SKU-013', images: [], skuId: 'SKU-013', productName: 'Cylinder Barrel', categoryName: 'Lock Box', productType: 'Component', barcode: '8901234500134', quantity: 60, unit: 'PCS', locationName: 'Raw Material Area', status: 'Inactive', unitCost: 300, createdDate: '20 Jan 2025', assembly: [] },
];
