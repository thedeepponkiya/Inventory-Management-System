export interface ReportCategory {
    id: string;
    label: string;
    description: string;
    count: number;
    path: string;
}

export interface RecentReport {
    id: string;
    name: string;
    type: string;
    generatedOn: string;
    generatedBy: string;
    format: 'PDF' | 'Excel';
}

export const reportKpiMockData = {
    totalInwardValue: 7245680,
    totalIssueValue: 4832210,
    totalTransferValue: 2118450,
    totalReturnValue: 678320,
    currentStockValue: 12567890,
};

export const reportCategoriesMockData: ReportCategory[] = [
    { id: 'RC-1', label: 'Stock Reports', description: 'View stock summary, stock details, and stock valuation.', count: 8, path: '/sku-master' },
    { id: 'RC-2', label: 'Transaction Reports', description: 'Analyze inward, issue, transfer and return transactions.', count: 10, path: '/transactions' },
    { id: 'RC-3', label: 'Invoice Reports', description: 'View invoice summary, aging and detailed reports.', count: 6, path: '/invoices' },
    { id: 'RC-4', label: 'Kit Reports', description: 'Analyze kit details, BOM and component usage.', count: 5, path: '/home' },
    { id: 'RC-5', label: 'Location Reports', description: 'View stock and activity by locations.', count: 4, path: '/locations' },
];

export const recentReportsMockData: RecentReport[] = [
    { id: 'RPT-1', name: 'Stock Summary Report', type: 'Stock Report', generatedOn: '21 May 2025, 10:30 AM', generatedBy: 'Admin User', format: 'PDF' },
    { id: 'RPT-2', name: 'Material Inward Report', type: 'Transaction Report', generatedOn: '21 May 2025, 09:15 AM', generatedBy: 'Admin User', format: 'Excel' },
    { id: 'RPT-3', name: 'Issue Report', type: 'Transaction Report', generatedOn: '20 May 2025, 05:45 PM', generatedBy: 'Admin User', format: 'Excel' },
    { id: 'RPT-4', name: 'Invoice Summary Report', type: 'Invoice Report', generatedOn: '20 May 2025, 03:20 PM', generatedBy: 'Admin User', format: 'PDF' },
    { id: 'RPT-5', name: 'Kit BOM Report', type: 'Kit Report', generatedOn: '19 May 2025, 11:10 AM', generatedBy: 'Admin User', format: 'PDF' },
];
