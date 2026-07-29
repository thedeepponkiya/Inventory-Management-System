export interface Category {
    id: string;
    code: string;
    name: string;
    description: string;
    skuCount: number;
    status: 'Active' | 'Inactive';
}

export const categoryMockData: Category[] = [
    { id: 'CAT-001', code: 'CAT-001', name: 'Handle Box', description: 'Handles used in mortise and pull handle kits', skuCount: 1, status: 'Active' },
    { id: 'CAT-002', code: 'CAT-002', name: 'Plate Box', description: 'Mounting plates for handles and locks', skuCount: 1, status: 'Active' },
    { id: 'CAT-003', code: 'CAT-003', name: 'Spring Box', description: 'Return springs for handles', skuCount: 1, status: 'Active' },
    { id: 'CAT-004', code: 'CAT-004', name: 'Bush Box', description: 'Bushes and sleeves', skuCount: 1, status: 'Active' },
    { id: 'CAT-005', code: 'CAT-005', name: 'Screw Box', description: 'Screws, washers and nuts', skuCount: 3, status: 'Active' },
    { id: 'CAT-006', code: 'CAT-006', name: 'Pin Box', description: 'Alignment and hinge pins', skuCount: 1, status: 'Active' },
    { id: 'CAT-007', code: 'CAT-007', name: 'Lock Box', description: 'Lock bodies and keys', skuCount: 2, status: 'Active' },
    { id: 'CAT-008', code: 'CAT-008', name: 'Tools Box', description: 'Installation tools', skuCount: 1, status: 'Active' },
    { id: 'CAT-009', code: 'CAT-009', name: 'Hinges Box', description: 'Hinge components', skuCount: 1, status: 'Active' },
];
