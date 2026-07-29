export interface Location {
    id: string;
    code: string;
    name: string;
    description: string;
    warehouseArea: string;
    aisleRow: string;
    rackShelf: string;
    binPosition: string;
    totalSkus: number;
    status: 'Active' | 'Inactive';
}

export const locationMockData: Location[] = [
    { id: 'LOC-001', code: 'LOC-001', name: 'Main Warehouse - A1', description: 'Row A, Rack 1', warehouseArea: 'Main Warehouse', aisleRow: 'A', rackShelf: '1', binPosition: '-', totalSkus: 32, status: 'Active' },
    { id: 'LOC-002', code: 'LOC-002', name: 'Main Warehouse - A2', description: 'Row A, Rack 2', warehouseArea: 'Main Warehouse', aisleRow: 'A', rackShelf: '2', binPosition: '-', totalSkus: 28, status: 'Active' },
    { id: 'LOC-003', code: 'LOC-003', name: 'Main Warehouse - B1', description: 'Row B, Rack 1', warehouseArea: 'Main Warehouse', aisleRow: 'B', rackShelf: '1', binPosition: '-', totalSkus: 25, status: 'Active' },
    { id: 'LOC-004', code: 'LOC-004', name: 'Main Warehouse - B2', description: 'Row B, Rack 2', warehouseArea: 'Main Warehouse', aisleRow: 'B', rackShelf: '2', binPosition: '-', totalSkus: 30, status: 'Active' },
    { id: 'LOC-005', code: 'LOC-005', name: 'Spare Parts Section', description: 'Spare components area', warehouseArea: 'Spare Parts', aisleRow: 'S', rackShelf: '1', binPosition: '-', totalSkus: 20, status: 'Active' },
    { id: 'LOC-006', code: 'LOC-006', name: 'Finished Goods Area', description: 'Ready to dispatch area', warehouseArea: 'Finished Goods', aisleRow: 'F', rackShelf: '1', binPosition: '-', totalSkus: 15, status: 'Active' },
    { id: 'LOC-007', code: 'LOC-007', name: 'Quarantine Area', description: 'QC hold area', warehouseArea: 'Quarantine', aisleRow: 'Q', rackShelf: '1', binPosition: '-', totalSkus: 8, status: 'Active' },
    { id: 'LOC-008', code: 'LOC-008', name: 'Raw Material Area', description: 'Raw material storage', warehouseArea: 'Raw Material', aisleRow: 'R', rackShelf: '1', binPosition: '-', totalSkus: 22, status: 'Active' },
    { id: 'LOC-009', code: 'LOC-009', name: 'Returns Area', description: 'Returned items storage', warehouseArea: 'Returns', aisleRow: 'R', rackShelf: '2', binPosition: '-', totalSkus: 6, status: 'Inactive' },
    { id: 'LOC-010', code: 'LOC-010', name: 'Old Stock Area', description: 'Old / slow moving items', warehouseArea: 'Old Stock', aisleRow: 'O', rackShelf: '1', binPosition: '-', totalSkus: 4, status: 'Inactive' },
    { id: 'LOC-011', code: 'LOC-011', name: 'Tools Area - T1', description: 'Tools and fixtures storage', warehouseArea: 'Tools', aisleRow: 'T', rackShelf: '1', binPosition: '-', totalSkus: 9, status: 'Active' },
    { id: 'LOC-012', code: 'LOC-012', name: 'Main Warehouse - C1', description: 'Row C, Rack 1', warehouseArea: 'Main Warehouse', aisleRow: 'C', rackShelf: '1', binPosition: '-', totalSkus: 14, status: 'Active' },
];
