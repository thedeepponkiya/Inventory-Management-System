export interface ProductType {
    id: string;
    code: string;
    name: string;
    description: string;
    status: 'Active' | 'Inactive';
}

export const productTypeMockData: ProductType[] = [
    { id: 'PT-001', code: 'PT-001', name: 'Component', description: 'Individual parts used to assemble kits', status: 'Active' },
    { id: 'PT-002', code: 'PT-002', name: 'Consumable', description: 'Fasteners and other items consumed during assembly', status: 'Active' },
    { id: 'PT-003', code: 'PT-003', name: 'Finished Good', description: 'Ready-to-sell assembled products', status: 'Active' },
    { id: 'PT-004', code: 'PT-004', name: 'Tool', description: 'Installation and maintenance tools', status: 'Active' },
    { id: 'PT-005', code: 'PT-005', name: 'Raw Material', description: 'Unprocessed material stock', status: 'Active' },
];
