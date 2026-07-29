export const supplierMockData = ['ABC Tools', 'XYZ Pvt. Ltd.', 'Shree Enterprises', 'Global Industries', 'Precision Engineering'];

export const transporterMockData = ['FastTrack Logistics', 'Speed Cargo', 'City Transport'];

export interface RecentInward {
    id: string;
    invoiceNo: string;
    date: string;
    amount: number;
    paymentStatus: 'Paid' | 'Unpaid';
}

export const recentInwardsMockData: RecentInward[] = [
    { id: 'MI-1', invoiceNo: 'INV-250521-014', date: '20 May 2025', amount: 32150, paymentStatus: 'Paid' },
    { id: 'MI-2', invoiceNo: 'INV-250520-013', date: '19 May 2025', amount: 21850, paymentStatus: 'Paid' },
    { id: 'MI-3', invoiceNo: 'INV-250519-012', date: '18 May 2025', amount: 18200, paymentStatus: 'Paid' },
    { id: 'MI-4', invoiceNo: 'INV-250518-011', date: '17 May 2025', amount: 27600, paymentStatus: 'Unpaid' },
];
