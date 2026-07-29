export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Administrator' | 'Store Manager' | 'Warehouse Staff' | 'Accountant';
    status: 'Active' | 'Inactive';
}

export const userMockData: User[] = [
    { id: 'USR-001', name: 'Admin User', email: 'admin@inventory.com', role: 'Administrator', status: 'Active' },
    { id: 'USR-002', name: 'Priya Sharma', email: 'priya.sharma@inventory.com', role: 'Store Manager', status: 'Active' },
    { id: 'USR-003', name: 'Ravi Kumar', email: 'ravi.kumar@inventory.com', role: 'Warehouse Staff', status: 'Active' },
    { id: 'USR-004', name: 'Neha Verma', email: 'neha.verma@inventory.com', role: 'Accountant', status: 'Active' },
    { id: 'USR-005', name: 'Amit Patel', email: 'amit.patel@inventory.com', role: 'Warehouse Staff', status: 'Inactive' },
    { id: 'USR-006', name: 'Sanjay Rao', email: 'sanjay.rao@inventory.com', role: 'Store Manager', status: 'Active' },
];
