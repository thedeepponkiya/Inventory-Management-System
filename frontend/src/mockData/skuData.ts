export interface Sku {
    id: string;
    code: string;
    name: string;
    categoryName: string;
    locationName: string;
    unit: string;
    currentStock: number;
    unitPrice: number;
    reorderLevel: number;
    description: string;
    status: 'Active' | 'Inactive';
}

export const skuMockData: Sku[] = [
    { id: 'SKU-001', code: 'SKU-001', name: 'Handle', categoryName: 'Handle Box', locationName: 'Main Warehouse - A1', unit: 'PCS', currentStock: 1250, unitPrice: 120, reorderLevel: 50, description: 'Mortise handle', status: 'Active' },
    { id: 'SKU-002', code: 'SKU-002', name: 'Plate', categoryName: 'Plate Box', locationName: 'Main Warehouse - A1', unit: 'PCS', currentStock: 980, unitPrice: 100, reorderLevel: 40, description: 'Handle mounting plate', status: 'Active' },
    { id: 'SKU-003', code: 'SKU-003', name: 'Spring', categoryName: 'Spring Box', locationName: 'Main Warehouse - B1', unit: 'PCS', currentStock: 1100, unitPrice: 80, reorderLevel: 60, description: 'Return spring', status: 'Active' },
    { id: 'SKU-004', code: 'SKU-004', name: 'Bush', categoryName: 'Bush Box', locationName: 'Main Warehouse - B1', unit: 'PCS', currentStock: 640, unitPrice: 70, reorderLevel: 40, description: 'Handle bush', status: 'Active' },
    { id: 'SKU-005', code: 'SKU-005', name: 'Screw', categoryName: 'Screw Box', locationName: 'Main Warehouse - A2', unit: 'PCS', currentStock: 4800, unitPrice: 30, reorderLevel: 80, description: 'Fixing screw', status: 'Active' },
    { id: 'SKU-006', code: 'SKU-006', name: 'Pin', categoryName: 'Pin Box', locationName: 'Main Warehouse - A2', unit: 'PCS', currentStock: 1260, unitPrice: 20, reorderLevel: 60, description: 'Alignment pin', status: 'Active' },
    { id: 'SKU-007', code: 'SKU-007', name: 'Washer', categoryName: 'Screw Box', locationName: 'Main Warehouse - A2', unit: 'PCS', currentStock: 2300, unitPrice: 15, reorderLevel: 60, description: 'Flat washer', status: 'Active' },
    { id: 'SKU-008', code: 'SKU-008', name: 'Nut', categoryName: 'Screw Box', locationName: 'Main Warehouse - A2', unit: 'PCS', currentStock: 2150, unitPrice: 10, reorderLevel: 60, description: 'Hex nut', status: 'Active' },
    { id: 'SKU-009', code: 'SKU-009', name: 'Lock Body', categoryName: 'Lock Box', locationName: 'Finished Goods Area', unit: 'PCS', currentStock: 320, unitPrice: 250, reorderLevel: 30, description: 'Cylinder lock body', status: 'Active' },
    { id: 'SKU-010', code: 'SKU-010', name: 'Key', categoryName: 'Lock Box', locationName: 'Finished Goods Area', unit: 'PCS', currentStock: 510, unitPrice: 150, reorderLevel: 30, description: 'Lock key', status: 'Active' },
    { id: 'SKU-011', code: 'SKU-011', name: 'Allen Key', categoryName: 'Tools Box', locationName: 'Spare Parts Section', unit: 'PCS', currentStock: 400, unitPrice: 25, reorderLevel: 20, description: 'Installation tool', status: 'Active' },
    { id: 'SKU-012', code: 'SKU-012', name: 'Hinge Pin', categoryName: 'Hinges Box', locationName: 'Main Warehouse - A1', unit: 'PCS', currentStock: 900, unitPrice: 18, reorderLevel: 40, description: 'Door hinge pin', status: 'Active' },
    { id: 'SKU-013', code: 'SKU-013', name: 'Cylinder Barrel', categoryName: 'Lock Box', locationName: 'Raw Material Area', unit: 'PCS', currentStock: 60, unitPrice: 300, reorderLevel: 25, description: 'Old, slow-moving item', status: 'Inactive' },
];
